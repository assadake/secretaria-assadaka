#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests de l'archivage du Secrétariat (SQLite temporaire, port éphémère).

Lancer :  python -m unittest discover -s tests -v
"""
import http.client
import json
import os
import pathlib
import re
import sys
import tempfile
import threading
import unittest
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

_TMP = tempfile.mkdtemp(prefix='secretariat-test-')
os.environ['DB_PATH'] = os.path.join(_TMP, 'test.db')
os.environ.pop('DATABASE_URL', None)
os.environ.pop('APP_PASSWORD', None)
os.environ.pop('APP_PASSWORD_HASH', None)
os.environ.pop('RENDER', None)

import server  # noqa: E402
import build as builder  # noqa: E402


class SecurityPrimitives(unittest.TestCase):
    def test_hash_password_roundtrip(self):
        h = server.hash_password('سرّ-سري-123', iterations=1000)
        self.assertTrue(h.startswith('pbkdf2_sha256$1000$'))
        old = os.environ.get('APP_PASSWORD_HASH')
        os.environ['APP_PASSWORD_HASH'] = h
        try:
            self.assertTrue(server.check_password('سرّ-سري-123'))
            self.assertFalse(server.check_password('nope'))
        finally:
            if old is None:
                os.environ.pop('APP_PASSWORD_HASH', None)
            else:
                os.environ['APP_PASSWORD_HASH'] = old

    def test_session_sign_verify_revoke(self):
        store = server.init_store()
        tok = server.new_session(store)
        self.assertTrue(server.session_valid(tok, store))
        exp, nonce = server._parse_and_verify_token(tok, store)
        self.assertGreater(exp, 0)
        server.revoke_session(tok, store)
        self.assertFalse(server.session_valid(tok, store))

    def test_render_ref_default_pattern(self):
        self.assertEqual(server.render_ref('{c}/{t}/{y}/{n:04d}', 'AIS', 'SHA', 2026, 11, 7),
                         'AIS/SHA/2026/0007')
        self.assertEqual(server.render_ref('{c}-{yy}-{mm}-{t}-{n:03d}', 'AIS', 'COR', 2026, 3, 42),
                         'AIS-26-03-COR-042')
        self.assertEqual(server.render_ref('{n}', 'AIS', 'SHA', 2026, 11, 9), '9')

    def test_extract_counters_normalizes_company_ids(self):
        from datetime import datetime
        created = int(datetime(2026, 6, 1).timestamp() * 1000)
        payload = {
            'companies': [{'id': 'ais', 'code': 'AIS'}],
            'counter': {'ais|SHA|2026': 4, 'AIS|COR|2026': 2},
            'letters': [{'companyId': 'ais', 'tplCode': 'SHA', 'ref': 'AIS/SHA/2026/0009',
                         'createdAt': created}],
        }
        counters = server._extract_counters_from_payload(payload)
        self.assertEqual(counters['AIS|SHA|2026'], 9)
        self.assertEqual(counters['AIS|COR|2026'], 2)

    def test_version_consistency(self):
        v_file = json.loads((ROOT / 'version.json').read_text(encoding='utf-8'))['version']
        app_js = (ROOT / 'src' / 'app.js').read_text(encoding='utf-8')
        m = re.search(r"APP_VER = '([^']+)'", app_js)
        self.assertEqual(v_file, server.APP_VERSION)
        self.assertEqual(v_file, m.group(1))

    def test_build_is_fresh(self):
        built = builder.build_html()
        for name in ('index.html', 'secretariat.html'):
            committed = (ROOT / name).read_text(encoding='utf-8')
            self.assertEqual(committed, built, f'{name} n’est pas à jour — lancez python build.py')


class APIServer(unittest.TestCase):
    """Serveur réel sur un port éphémère, base SQLite temporaire."""

    @classmethod
    def setUpClass(cls):
        cls.store = server.init_store()
        cls.httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.httpd.daemon_threads = True
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def _req(self, method, path, body=None, headers=None, raw=False):
        data = json.dumps(body).encode('utf-8') if body is not None else None
        hdrs = {'Content-Type': 'application/json'}
        hdrs.update(headers or {})
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        conn.request(method, path, body=data, headers=hdrs)
        res = conn.getresponse()
        payload = res.read()
        ctype = res.getheader('Content-Type') or ''
        out = {
            'status': res.status,
            'headers': {k.lower(): v for k, v in res.getheaders()},
            'raw': payload,
        }
        if not raw and 'application/json' in ctype:
            out['json'] = json.loads(payload.decode('utf-8'))
        conn.close()
        return out

    def test_01_health(self):
        r = self._req('GET', '/api/health')
        self.assertEqual(r['status'], 200)
        self.assertTrue(r['json']['ok'])
        self.assertEqual(r['json']['storage'], 'sqlite')
        self.assertIn('content-security-policy', r['headers'])
        self.assertIn('x-content-type-options', r['headers'])

    def test_02_static_gzip_and_etag(self):
        r = self._req('GET', '/index.html', raw=True, headers={'Accept-Encoding': 'gzip'})
        self.assertEqual(r['status'], 200)
        self.assertEqual(r['headers'].get('content-encoding'), 'gzip')
        import gzip
        self.assertIn(b'<html', gzip.decompress(r['raw']))
        etag = r['headers'].get('etag')
        self.assertTrue(etag)
        r2 = self._req('GET', '/index.html', headers={'If-None-Match': etag})
        self.assertEqual(r2['status'], 304)

    def test_03_forbidden_files(self):
        for p in ('/server.py', '/.env', '/config.json', '/data/secretariat.db'):
            r = self._req('GET', p)
            self.assertIn(r['status'], (403, 404), p)

    def test_04_counter_preview_and_consume(self):
        r = self._req('GET', '/api/next-ref?company=AIS&tpl=TS1&pattern=%7Bc%7D%2F%7Bt%7D%2F%7By%7D%2F%7Bn%3A04d%7D')
        self.assertEqual(r['status'], 200)
        ref = r['json']['ref']
        self.assertRegex(ref, r'^AIS/TS1/\d{4}/\d{4}$')
        r1 = self._req('POST', '/api/counter', {'name': 'AIS|TS1|2099', 'pattern': '{c}/{t}/{y}/{n:04d}'})
        self.assertEqual(r1['json']['n'], 1)
        r2 = self._req('POST', '/api/counter', {'name': 'AIS|TS1|2099', 'pattern': '{c}/{t}/{y}/{n:04d}'})
        self.assertEqual(r2['json']['n'], 2)

    def test_05_doc_roundtrip(self):
        doc = {'kind': 'employee', 'data': {'name': 'اختبار الموظف', 'position': 'سكرتارية'}}
        r = self._req('POST', '/api/doc', doc)
        self.assertTrue(r['json']['ok'])
        self.assertTrue(r['json']['data']['id'])
        r = self._req('GET', '/api/state')
        names = [e['name'] for e in r['json']['employees']]
        self.assertIn('اختبار الموظف', names)

    def test_06_wipe_requires_confirmation(self):
        r = self._req('POST', '/api/wipe', {})
        self.assertEqual(r['status'], 400)
        r = self._req('POST', '/api/wipe', {'confirm': 'DELETE_ALL'})
        self.assertEqual(r['status'], 200)

    def test_07_auth_flow_with_password(self):
        old = os.environ.get('APP_PASSWORD')
        os.environ['APP_PASSWORD'] = 'mot-de-passe-de-test'
        try:
            r = self._req('GET', '/api/state')
            self.assertEqual(r['status'], 401)
            r = self._req('POST', '/api/login', {'password': 'mauvais'})
            self.assertEqual(r['status'], 401)
            r = self._req('POST', '/api/login', {'password': 'mot-de-passe-de-test'})
            self.assertEqual(r['status'], 200)
            cookie = r['headers'].get('set-cookie', '')
            self.assertIn('sirr_sid=', cookie)
            self.assertIn('HttpOnly', cookie)
            token = cookie.split('sirr_sid=', 1)[1].split(';', 1)[0]
            r = self._req('GET', '/api/state', headers={'Cookie': f'sirr_sid={token}'})
            self.assertEqual(r['status'], 200)
            r = self._req('POST', '/api/logout', {}, headers={'Cookie': f'sirr_sid={token}'})
            self.assertEqual(r['status'], 200)
            r = self._req('GET', '/api/state', headers={'Cookie': f'sirr_sid={token}'})
            self.assertEqual(r['status'], 401)
        finally:
            if old is None:
                os.environ.pop('APP_PASSWORD', None)
            else:
                os.environ['APP_PASSWORD'] = old


if __name__ == '__main__':
    unittest.main()
