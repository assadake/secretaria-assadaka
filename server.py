#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام المراسلات — الأرشيف المشترك
Serveur local : archive commune (SQLite) + API + service des fichiers de l'application.
Python 3.8+ — bibliothèque standard uniquement (aucune installation).

Démarrage :  python server.py        (ou double-clic sur demarrer_serveur.bat)
"""

import base64
import hashlib
import hmac
import io
import json
import mimetypes
import os
import re
import shutil
import socket
import sqlite3
import sys
import threading
import time
import urllib.parse
import zipfile
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(APP_DIR, 'config.json')
APP_VERSION = '1.2.0'

# ---- mise à jour de l'application (depuis l'interface) ----
UPDATE_ALLOWED = {'index.html', 'secretariat.html', 'server.py'}
UPDATE_ALLOWED_EXT = ('.md', '.pdf', '.bat', '.json')
APP_BACKUP_DIR = os.path.join(APP_DIR, 'backups', 'app')

DEFAULT_CONFIG = {
    "host": "0.0.0.0",
    "port": 8080,
    "password": "",
    "db": "data/secretariat.db",
    "backup_keep": 30
}


# ============================================================
#  Configuration
# ============================================================
def load_config():
    cfg = dict(DEFAULT_CONFIG)
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                cfg.update(json.load(f) or {})
        except Exception as e:
            print('[!] config.json illisible :', e)
    else:
        try:
            with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
    return cfg


CFG = load_config()
DB_PATH = CFG['db'] if os.path.isabs(CFG['db']) else os.path.join(APP_DIR, CFG['db'])
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

SEED_SETTINGS = {
    "city": "طرابلس", "dateStyle": "long", "showStamp": True,
    "showWatermark": True, "activeCompany": "ais"
}

SEED_COMPANIES = [
    {
        "id": "ais", "active": True, "layout": "ais",
        "name": "شركة الصداقة المثالية لصناعة المشروبات والمواد الغذائية",
        "short": "الصداقة المثالية", "code": "AIS", "nameEn": "Al-Sadaqa Al-Mithalia",
        "address": "خلف مسجد أبو بكر الصديق، شارع اليبيبا، طرابلس – ليبيا",
        "phone": "094 400 4002 – 091 000 1833", "web": "www.ais.ly", "email": "info@ais.ly",
        "signTitle": "رئيس مجلس الإدارة", "signName": "",
        "refLabel": "الرقم", "headerImg": "", "footerImg": "", "watermarkImg": ""
    },
    {
        "id": "aisbm", "active": True, "layout": "aisbm",
        "name": "شركة الصداقة المثالية لاستيراد مواد البناء والمواد الصحية",
        "short": "الصداقة المثالية — مواد البناء", "code": "AIS-BM", "nameEn": "AIS Building Materials",
        "address": "طرابلس – ليبيا", "phone": "+218 91 315 0095",
        "web": "www.assadaka.ly", "email": "info@assadaka.ly",
        "signTitle": "المدير العام", "signName": "",
        "refLabel": "الرقم الاشاري", "headerImg": "", "footerImg": "",
        "watermarkImg": "", "useWatermark": True
    }
]


# ============================================================
#  Base de données (magasin de documents JSON)
# ============================================================
class Store:
    def __init__(self, path):
        self.path = path
        self.lock = threading.RLock()
        self.seed_if_empty()
        self.backup_on_start()

    def connect(self):
        con = sqlite3.connect(self.path, timeout=20)
        con.execute('PRAGMA journal_mode=WAL')
        con.execute('PRAGMA synchronous=NORMAL')
        con.row_factory = sqlite3.Row
        return con

    def seed_if_empty(self):
        with self.lock:
            con = self.connect()
            try:
                con.execute("""CREATE TABLE IF NOT EXISTS docs(
                    kind TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL,
                    updated_at INTEGER NOT NULL, PRIMARY KEY(kind, id))""")
                con.execute("CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)")
                con.execute("CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)")
                row = con.execute("SELECT COUNT(*) c FROM docs WHERE kind='company'").fetchone()
                if row['c'] == 0:
                    now = int(time.time())
                    for c in SEED_COMPANIES:
                        con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('company',?,?,?)",
                                    (c['id'], json.dumps(c, ensure_ascii=False), now))
                    con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('setting','main',?,?)",
                                (json.dumps(SEED_SETTINGS, ensure_ascii=False), now))
                    con.execute("INSERT OR REPLACE INTO meta(k,v) VALUES('rev','1')")
                    con.commit()
                    print('[i] Archives initialisées (2 sociétés).')
            finally:
                con.close()

    def backup_on_start(self):
        try:
            bdir = os.path.join(os.path.dirname(self.path), 'backups')
            os.makedirs(bdir, exist_ok=True)
            stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
            dst = os.path.join(bdir, 'secretariat-%s.db' % stamp)
            if os.path.exists(self.path):
                shutil.copy2(self.path, dst)
                keep = int(CFG.get('backup_keep', 30))
                files = sorted(f for f in os.listdir(bdir) if f.endswith('.db'))
                for old in files[:-keep]:
                    try:
                        os.remove(os.path.join(bdir, old))
                    except OSError:
                        pass
        except Exception as e:
            print('[!] Sauvegarde de démarrage impossible :', e)

    # ---------- helpers ----------
    def _bump(self, con):
        con.execute("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT)")
        r = con.execute("SELECT v FROM meta WHERE k='rev'").fetchone()
        return int(r['v']) if r else 0

    def rev(self):
        with self.lock:
            con = self.connect()
            try:
                r = con.execute("SELECT v FROM meta WHERE k='rev'").fetchone()
                return int(r['v']) if r else 0
            finally:
                con.close()

    def state(self):
        with self.lock:
            con = self.connect()
            try:
                out = {'settings': dict(SEED_SETTINGS), 'companies': [], 'employees': [], 'letters': [], 'rev': 0}
                for row in con.execute("SELECT kind,id,json FROM docs"):
                    data = json.loads(row['json'])
                    k = row['kind']
                    if k == 'setting' and row['id'] == 'main':
                        out['settings'].update(data)
                    elif k in ('company', 'employee', 'letter'):
                        out[k + 's' if k != 'company' else 'companies'].append(data)
                r = con.execute("SELECT v FROM meta WHERE k='rev'").fetchone()
                out['rev'] = int(r['v']) if r else 0
                out['letters'].sort(key=lambda l: l.get('createdAt', 0), reverse=True)
                out['companies'].sort(key=lambda c: 0 if c.get('id') == 'ais' else 1)
                out['employees'].sort(key=lambda e: e.get('name', ''))
                return out
            finally:
                con.close()

    def upsert(self, kind, data):
        if kind not in ('company', 'employee', 'letter'):
            raise ValueError('kind invalide')
        data = dict(data or {})
        if not data.get('id'):
            data['id'] = base64.urlsafe_b64encode(os.urandom(9)).decode().rstrip('=')
        with self.lock:
            con = self.connect()
            try:
                con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES(?,?,?,?) "
                            "ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at",
                            (kind, data['id'], json.dumps(data, ensure_ascii=False), int(time.time())))
                rev = self._bump(con)
                con.commit()
                return data, rev
            finally:
                con.close()

    def delete(self, kind, doc_id):
        with self.lock:
            con = self.connect()
            try:
                con.execute("DELETE FROM docs WHERE kind=? AND id=?", (kind, doc_id))
                rev = self._bump(con)
                con.commit()
                return rev
            finally:
                con.close()

    def patch_settings(self, patch):
        with self.lock:
            con = self.connect()
            try:
                row = con.execute("SELECT json FROM docs WHERE kind='setting' AND id='main'").fetchone()
                cur = json.loads(row['json']) if row else dict(SEED_SETTINGS)
                cur.update(patch or {})
                con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('setting','main',?,?) "
                            "ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at",
                            (json.dumps(cur, ensure_ascii=False), int(time.time())))
                rev = self._bump(con)
                con.commit()
                return cur, rev
            finally:
                con.close()

    def next_counter(self, name, consume=True):
        with self.lock:
            con = self.connect()
            try:
                row = con.execute("SELECT value FROM counters WHERE name=?", (name,)).fetchone()
                cur = row['value'] if row else 0
                n = cur + (1 if consume else 0)
                if consume:
                    con.execute("INSERT INTO counters(name,value) VALUES(?,?) "
                                "ON CONFLICT(name) DO UPDATE SET value=excluded.value", (name, n))
                    con.commit()
                    return n
                return cur + 1
            finally:
                con.close()

    def replace_all(self, payload):
        with self.lock:
            con = self.connect()
            try:
                con.execute("DELETE FROM docs")
                now = int(time.time())
                for kind, key in (('company', 'companies'), ('employee', 'employees'), ('letter', 'letters')):
                    for item in payload.get(key) or []:
                        item = dict(item)
                        item.setdefault('id', base64.urlsafe_b64encode(os.urandom(9)).decode().rstrip('='))
                        con.execute("INSERT OR REPLACE INTO docs(kind,id,json,updated_at) VALUES(?,?,?,?)",
                                    (kind, item['id'], json.dumps(item, ensure_ascii=False), now))
                settings = dict(SEED_SETTINGS)
                settings.update(payload.get('settings') or {})
                con.execute("INSERT OR REPLACE INTO docs(kind,id,json,updated_at) VALUES('setting','main',?,?)",
                            (json.dumps(settings, ensure_ascii=False), now))
                rev = self._bump(con)
                con.commit()
                return rev
            finally:
                con.close()

    def wipe(self):
        with self.lock:
            con = self.connect()
            try:
                con.execute("DELETE FROM docs")
                con.execute("DELETE FROM counters")
                now = int(time.time())
                for c in SEED_COMPANIES:
                    con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('company',?,?,?)",
                                (c['id'], json.dumps(c, ensure_ascii=False), now))
                con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('setting','main',?,?)",
                            (json.dumps(SEED_SETTINGS, ensure_ascii=False), now))
                rev = self._bump(con)
                con.commit()
                return rev
            finally:
                con.close()


REF_DEFAULT = '{c}/{t}/{y}/{n:04d}'


def render_ref(pattern, c='', t='', y=None, m=None, n=1):
    """Rend un motif de numérotation identique à celui de l'application."""
    import re as _re
    y = y or datetime.now().year
    m = m or datetime.now().month
    out = str(pattern or REF_DEFAULT)
    out = out.replace('{c}', str(c)).replace('{t}', str(t))
    out = out.replace('{y}', str(y)).replace('{yy}', str(y)[-2:])
    out = out.replace('{mm}', str(m).zfill(2))
    out = _re.sub(r'\{n(?::0?(\d+)d)?\}',
                  lambda mo: str(n).zfill(int(mo.group(1))) if mo.group(1) else str(n), out)
    return out


STORE = Store(DB_PATH)


# ============================================================
#  Sessions
# ============================================================
SESSIONS = {}          # token -> expiry timestamp
SESSION_TTL = 12 * 3600
_auth_lock = threading.Lock()


def auth_required():
    return bool(str(CFG.get('password') or '').strip())


def new_session():
    token = base64.urlsafe_b64encode(os.urandom(24)).decode().rstrip('=')
    with _auth_lock:
        SESSIONS[token] = time.time() + SESSION_TTL
    return token


def session_valid(token):
    if not token:
        return False
    with _auth_lock:
        exp = SESSIONS.get(token)
        if not exp:
            return False
        if exp < time.time():
            SESSIONS.pop(token, None)
            return False
        return True


def check_password(pw):
    expected = str(CFG.get('password') or '')
    return hmac.compare_digest((pw or '').encode('utf-8'), expected.encode('utf-8'))


# ============================================================
#  Serveur HTTP
# ============================================================
MIME_EXTRA = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.woff2': 'font/woff2',
}


class Handler(SimpleHTTPRequestHandler):
    server_version = 'Secretariat/' + APP_VERSION
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    # ---------- utilitaires ----------
    def log_message(self, fmt, *args):
        if '/api/rev' in (self.path or ''):
            return
        sys.stdout.write('%s  %s\n' % (time.strftime('%H:%M:%S'), fmt % args))

    def _json(self, obj, code=200, headers=None):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def _read_json(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0:
                return {}
            raw = self.rfile.read(n)
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return {}

    def _cookie_token(self):
        raw = self.headers.get('Cookie') or ''
        for part in raw.split(';'):
            if '=' in part:
                k, v = part.split('=', 1)
                if k.strip() == 'sirr_sid':
                    return v.strip()
        return None

    def _authed(self):
        if not auth_required():
            return True
        return session_valid(self._cookie_token())

    # ---------- routage ----------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)
        if path.startswith('/api/'):
            return self.api_get(path, qs)
        return self.serve_static(path)

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/'):
            return self._json({'ok': True})
        return self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/'):
            return self.api_post(parsed.path)
        return self._json({'error': 'not found'}, 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/'):
            return self.api_put(parsed.path)
        return self._json({'error': 'not found'}, 404)

    # ---------- fichiers ----------
    def serve_static(self, path):
        if path in ('/', ''):
            path = '/index.html'
        rel = urllib.parse.unquote(path.lstrip('/'))
        if rel.startswith('data/') or rel.startswith('config.json'):
            return self._json({'error': 'forbidden'}, 403)
        full = os.path.normpath(os.path.join(APP_DIR, rel))
        if not full.startswith(APP_DIR) or not os.path.isfile(full):
            return self._json({'error': 'not found', 'path': rel}, 404)
        ext = os.path.splitext(full)[1].lower()
        ctype = MIME_EXTRA.get(ext) or mimetypes.guess_type(full)[0] or 'application/octet-stream'
        try:
            with open(full, 'rb') as f:
                data = f.read()
        except OSError:
            return self._json({'error': 'read error'}, 500)
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        # l'application doit toujours être à jour après une mise à jour du fichier
        self.send_header('Cache-Control', 'no-cache' if ext in ('.html', '.js', '.css') else 'max-age=3600')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    # ---------- API GET ----------
    def api_get(self, path, qs):
        if path == '/api/health':
            return self._json({
                'ok': True, 'app': 'secretariat', 'version': APP_VERSION, 'mode': 'server',
                'needsLogin': auth_required(), 'authed': self._authed(), 'rev': STORE.rev(),
                'appMtime': int(os.path.getmtime(os.path.join(APP_DIR, 'index.html')))
                            if os.path.exists(os.path.join(APP_DIR, 'index.html')) else 0
            })
        if not self._authed():
            return self._json({'error': 'auth required', 'needsLogin': True}, 401)
        if path == '/api/rev':
            return self._json({'rev': STORE.rev()})
        if path == '/api/state':
            return self._json(STORE.state())
        if path == '/api/export.json':
            st = STORE.state()
            st['exportedAt'] = datetime.now().isoformat(timespec='seconds')
            st['app'] = 'secretariat'
            body = json.dumps(st, ensure_ascii=False, indent=2).encode('utf-8')
            name = 'نسخة_احتياطية_%s.json' % datetime.now().strftime('%Y-%m-%d')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Disposition', "attachment; filename*=UTF-8''%s" % urllib.parse.quote(name))
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if path == '/api/next-ref':
            company = (qs.get('company') or [''])[0]
            tpl = (qs.get('tpl') or [''])[0]
            pattern = (qs.get('pattern') or [REF_DEFAULT])[0]
            year = datetime.now().year
            n = STORE.next_counter('%s|%s|%d' % (company, tpl, year), consume=False)
            return self._json({'ref': render_ref(pattern, company, tpl, year, datetime.now().month, n), 'preview': True})
        return self._json({'error': 'not found'}, 404)

    # ---------- API POST ----------
    def api_post(self, path):
        if path == '/api/login':
            data = self._read_json()
            if not auth_required():
                return self._json({'ok': True, 'authed': True})
            if check_password(data.get('password')):
                token = new_session()
                cookie = 'sirr_sid=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=Lax' % (token, SESSION_TTL)
                return self._json({'ok': True, 'authed': True}, headers={'Set-Cookie': cookie})
            time.sleep(0.4)
            return self._json({'ok': False, 'error': 'كلمة المرور غير صحيحة'}, 401)

        if path == '/api/logout':
            token = self._cookie_token()
            with _auth_lock:
                SESSIONS.pop(token, None)
            return self._json({'ok': True}, headers={'Set-Cookie': 'sirr_sid=; Path=/; Max-Age=0'})

        if not self._authed():
            return self._json({'error': 'auth required', 'needsLogin': True}, 401)

        if path == '/api/doc':
            data = self._read_json()
            kind = data.get('kind')
            try:
                obj, rev = STORE.upsert(kind, data.get('data'))
            except ValueError as e:
                return self._json({'error': str(e)}, 400)
            return self._json({'ok': True, 'data': obj, 'rev': rev})

        if path == '/api/doc/delete':
            data = self._read_json()
            return self._json({'ok': True, 'rev': STORE.delete(data.get('kind'), data.get('id'))})

        if path == '/api/settings':
            data = self._read_json()
            cur, rev = STORE.patch_settings(data.get('patch') or {})
            return self._json({'ok': True, 'settings': cur, 'rev': rev})

        if path == '/api/counter':
            data = self._read_json()
            name = str(data.get('name') or '')
            pattern = data.get('pattern') or REF_DEFAULT
            n = STORE.next_counter(name, consume=True)
            parts = name.split('|')
            company = parts[0] if len(parts) > 0 else ''
            tpl = parts[1] if len(parts) > 1 else ''
            year = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else datetime.now().year
            ref = render_ref(pattern, company, tpl, year, datetime.now().month, n)
            return self._json({'ok': True, 'n': n, 'ref': ref, 'rev': STORE.rev()})

        if path == '/api/update':
            return self.api_update()
        if path == '/api/restart':
            return self.api_restart()

        if path == '/api/wipe':
            return self._json({'ok': True, 'rev': STORE.wipe()})

        return self._json({'error': 'not found'}, 404)

    # ---------- Mise à jour de l'application ----------
    def api_update(self):
        import io as _io
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 60 * 1024 * 1024:
            return self._json({'error': 'حجم الملف غير صالح'}, 400)
        raw = self.rfile.read(n)
        name = urllib.parse.unquote(self.headers.get('X-Filename') or 'update.zip')
        is_zip = name.lower().endswith('.zip') or raw[:2] == b'PK'

        updated, skipped = [], []
        os.makedirs(APP_BACKUP_DIR, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d-%H%M%S')

        def install(fname, data, origin):
            """Écrit un fichier autorisé, avec sauvegarde de l'ancien."""
            fname = os.path.basename(fname)
            if fname not in UPDATE_ALLOWED and not fname.lower().endswith(UPDATE_ALLOWED_EXT):
                skipped.append(fname)
                return
            dst = os.path.join(APP_DIR, fname)
            if os.path.exists(dst):
                try:
                    shutil.copy2(dst, os.path.join(APP_BACKUP_DIR, '%s_%s' % (stamp, fname)))
                except OSError:
                    pass
            tmp = dst + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, dst)
            updated.append(fname)

        try:
            if is_zip:
                zf = zipfile.ZipFile(_io.BytesIO(raw))
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    member = info.filename.replace('\\', '/')
                    if member.startswith('__MACOSX'):
                        continue
                    base = os.path.basename(member)
                    if not base or '..' in member:
                        skipped.append(member)
                        continue
                    install(base, zf.read(info), name)
            else:
                install(name, raw, name)
        except (zipfile.BadZipFile, OSError) as e:
            return self._json({'error': 'ملف غير صالح: %s' % e}, 400)

        restart = 'server.py' in updated
        return self._json({
            'ok': True, 'updated': updated, 'skipped': skipped,
            'restartNeeded': restart, 'backupDir': os.path.relpath(APP_BACKUP_DIR, APP_DIR)
        })

    def api_restart(self):
        self._json({'ok': True, 'message': 'restarting'})
        try:
            self.wfile.flush()
        except Exception:
            pass
        def _restart():
            time.sleep(0.7)
            try:
                STORE.backup_on_start()
                os.execv(sys.executable, [sys.executable, os.path.join(APP_DIR, 'server.py')])
            except Exception as e:
                print('[!] Échec du redémarrage automatique :', e)
        threading.Thread(target=_restart, daemon=True).start()
        return

    # ---------- API PUT ----------
    def api_put(self, path):
        if not self._authed():
            return self._json({'error': 'auth required', 'needsLogin': True}, 401)
        if path == '/api/state':
            data = self._read_json()
            return self._json({'ok': True, 'rev': STORE.replace_all(data)})
        return self._json({'error': 'not found'}, 404)


# ============================================================
#  Démarrage
# ============================================================
def local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith('127.'):
                ips.append(ip)
    except Exception:
        pass
    return ips


def main():
    host = CFG.get('host', '0.0.0.0')
    port = int(os.environ.get('PORT') or CFG.get('port', 8080))
    try:
        httpd = ThreadingHTTPServer((host, port), Handler)
    except OSError as e:
        print('[!] Impossible d\'ouvrir le port %d : %s' % (port, e))
        print('    → fermez l\'autre programme, ou changez "port" dans config.json')
        input('Appuyez sur Entrée pour fermer...')
        return 1
    httpd.daemon_threads = True

    print('=' * 58)
    print('  نظام المراسلات والسكرتارية — الأرشيف المشترك')
    print('=' * 58)
    print('  Base de données : %s' % DB_PATH)
    print('  Mot de passe    : %s' % ('نعم (config.json)' if auth_required() else 'لا — الوصول مفتوح على الشبكة'))
    print('')
    print('  على هذا الجهاز  : http://localhost:%d/' % port)
    for ip in local_ips():
        print('  من أجهزة أخرى  : http://%s:%d/' % (ip, port))
    print('')
    print('  أوقف الخادم بـ Ctrl+C')
    print('=' * 58)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n[i] إيقاف الخادم...')
    finally:
        httpd.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
