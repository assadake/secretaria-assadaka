#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام المراسلات — الأرشيف المشترك (PostgreSQL / SQLite)
Serveur d'archive commune :
  • Cloud (Render / PostgreSQL) : via la variable d'environnement DATABASE_URL
  • Bureau local (Windows / PC) : via SQLite (data/secretariat.db, sans dépendances externes)

Variables d'environnement supportées (Render) :
  • DATABASE_URL          : URL de connexion PostgreSQL (ex. Render Postgres)
  • APP_PASSWORD          : mot de passe d'accès à l'archive partagée (recommandé)
  • APP_PASSWORD_HASH     : alternative hachée (pbkdf2_sha256$iterations$salt$hex)
  • SESSION_SECRET        : clé secrète de signature des cookies de session
  • SESSION_TTL_HOURS     : durée d'une session (défaut : 12 heures)
  • PORT                  : port d'écoute HTTP (fourni automatiquement par Render)

Démarrage :  python server.py
Générer un hash de mot de passe :  python server.py --hash-password "VotreMotDePasse"
"""

import base64
import getpass
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
APP_VERSION = '1.6.0'

# ---- mise à jour de l'application (depuis l'interface locale) ----
UPDATE_ALLOWED = {'index.html', 'secretariat.html', 'server.py'}
UPDATE_ALLOWED_EXT = ('.md', '.pdf', '.bat', '.json')
APP_BACKUP_DIR = os.path.join(APP_DIR, 'backups', 'app')

# ---- fichiers/dossiers interdits en téléchargement direct ----
FORBIDDEN_PREFIXES = ('data/', 'backups/', 'src/', '__pycache__/')
FORBIDDEN_FILES = {
    'config.json', 'render.yaml', 'requirements.txt',
    'secretariat_pc.zip', 'server.py', 'build.py'
}
FORBIDDEN_EXTS = (
    '.py', '.pyc', '.pyo', '.db', '.sqlite', '.sqlite3',
    '.bat', '.sh', '.yaml', '.yml', '.toml', '.ini', '.log', '.env'
)

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
    elif not os.environ.get('RENDER') and not os.environ.get('DATABASE_URL'):
        try:
            with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
    return cfg


CFG = load_config()
DATABASE_URL = (
    os.environ.get('DATABASE_URL')
    or os.environ.get('POSTGRES_URL')
    or CFG.get('database_url')
    or ''
).strip()
IS_CLOUD = bool(os.environ.get('RENDER') or DATABASE_URL)

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
#  Utilitaires communs de stockage
# ============================================================
DOC_KIND_MAP = {
    'company': 'companies',
    'employee': 'employees',
    'letter': 'letters',
    'credit': 'credits',
    'group_doc': 'groupDocs',
    'tracker': 'trackers',
}
DOC_KINDS = tuple(DOC_KIND_MAP.keys())
LISTED_KINDS = DOC_KINDS


def _new_doc_id():
    return base64.urlsafe_b64encode(os.urandom(9)).decode('ascii').rstrip('=')


def _empty_state():
    return {
        'settings': dict(SEED_SETTINGS),
        'companies': [],
        'employees': [],
        'letters': [],
        'credits': [],
        'groupDocs': [],
        'trackers': [],
        'counter': {},
        'rev': 0
    }


def _sort_state(out):
    out['letters'].sort(key=lambda l: l.get('createdAt', 0), reverse=True)
    out['companies'].sort(key=lambda c: 0 if c.get('id') == 'ais' else 1)
    out['employees'].sort(key=lambda e: e.get('name', ''))
    out.setdefault('credits', [])
    out['credits'].sort(key=lambda c: c.get('updatedAt') or c.get('createdAt') or 0, reverse=True)
    out.setdefault('groupDocs', [])
    out['groupDocs'].sort(key=lambda d: d.get('updatedAt') or d.get('createdAt') or 0, reverse=True)
    out.setdefault('trackers', [])
    out['trackers'].sort(key=lambda t: (t.get('order', 99), t.get('createdAt', 0)))
    return out


def _extract_counters_from_payload(payload):
    """Restaure les compteurs depuis un export JSON (serveur ou navigateur local)."""
    companies = (payload.get('companies') or []) + SEED_COMPANIES
    id_to_code = {}
    for c in companies:
        if isinstance(c, dict) and c.get('id') and c.get('code'):
            id_to_code[str(c['id'])] = str(c['code'])

    counters = {}
    raw_counters = payload.get('counter') or payload.get('counters') or {}
    if isinstance(raw_counters, dict):
        for k, v in raw_counters.items():
            try:
                val = int(v)
            except (TypeError, ValueError):
                continue
            if val <= 0:
                continue
            parts = str(k).split('|')
            if parts and parts[0] in id_to_code:
                parts[0] = id_to_code[parts[0]]
            norm_key = '|'.join(parts)
            counters[norm_key] = max(counters.get(norm_key, 0), val)

    # S'assure que les compteurs ne redescendent pas sous les numéros déjà attribués
    numbered = list(payload.get('letters') or [])
    for credit in (payload.get('credits') or []):
        if isinstance(credit, dict):
            numbered.append(dict(credit, tplCode='CRD'))
    for letter in numbered:
        if not isinstance(letter, dict):
            continue
        co_code = id_to_code.get(str(letter.get('companyId') or ''), '') or id_to_code.get('ais', '')
        tpl_code = str(letter.get('tplCode') or '')
        ref = str(letter.get('ref') or '')
        created = letter.get('createdAt')
        year = datetime.fromtimestamp(created / 1000.0).year if isinstance(created, (int, float)) and created > 0 else datetime.now().year
        m = re.search(r'(\d+)\s*$', ref)
        if co_code and tpl_code and m:
            seq = int(m.group(1))
            ckey = '%s|%s|%d' % (co_code, tpl_code, year)
            counters[ckey] = max(counters.get(ckey, 0), seq)
    return counters


# ============================================================
#  Base de données PostgreSQL (Render / Cloud)
# ============================================================
class PostgresStore:
    engine = 'postgres'

    def __init__(self, dsn):
        self.dsn = self._normalize_dsn(dsn)
        self.lock = threading.RLock()
        self._con = None
        self._driver, self._retry_errors = self._load_driver()
        self.seed_if_empty()

    @staticmethod
    def _normalize_dsn(dsn):
        if dsn.startswith('postgres://'):
            dsn = 'postgresql://' + dsn[len('postgres://'):]
        return dsn

    @staticmethod
    def _load_driver():
        try:
            import psycopg
            return ('psycopg3', psycopg), (psycopg.OperationalError, psycopg.InterfaceError)
        except ImportError:
            try:
                import psycopg2
                return ('psycopg2', psycopg2), (psycopg2.OperationalError, psycopg2.InterfaceError)
            except ImportError as exc:
                raise RuntimeError(
                    "Pilote PostgreSQL manquant. Installez 'psycopg[binary]' "
                    "(pip install -r requirements.txt)."
                ) from exc

    def _open_con(self):
        kind, mod = self._driver
        kwargs = {}
        if 'connect_timeout=' not in self.dsn:
            kwargs['connect_timeout'] = 10
        if kind == 'psycopg3':
            return mod.connect(self.dsn, autocommit=False, **kwargs)
        return mod.connect(self.dsn, **kwargs)

    def _get_con(self):
        if self._con is not None:
            closed = getattr(self._con, 'closed', True)
            # psycopg3 : closed est un bool ; psycopg2 : closed == 0 quand ouvert
            is_open = (closed is False) or (closed == 0)
            if is_open:
                return self._con
        self._con = self._open_con()
        return self._con

    def _run(self, fn):
        with self.lock:
            for attempt in range(2):
                con = self._get_con()
                try:
                    with con.cursor() as cur:
                        res = fn(cur)
                    con.commit()
                    return res
                except self._retry_errors:
                    try:
                        con.close()
                    except Exception:
                        pass
                    self._con = None
                    if attempt == 1:
                        raise
                except Exception:
                    try:
                        con.rollback()
                    except Exception:
                        pass
                    raise

    def seed_if_empty(self):
        def _init(cur):
            cur.execute("""
                CREATE TABLE IF NOT EXISTS docs (
                    kind TEXT NOT NULL,
                    id TEXT NOT NULL,
                    json TEXT NOT NULL,
                    updated_at BIGINT NOT NULL,
                    PRIMARY KEY (kind, id)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS counters (
                    name TEXT PRIMARY KEY,
                    value BIGINT NOT NULL DEFAULT 0
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS meta (
                    k TEXT PRIMARY KEY,
                    v TEXT
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS revoked_sessions (
                    nonce TEXT PRIMARY KEY,
                    exp BIGINT NOT NULL
                )
            """)
            salt = base64.urlsafe_b64encode(os.urandom(32)).decode('ascii').rstrip('=')
            cur.execute(
                "INSERT INTO meta(k, v) VALUES ('session_salt', %s) ON CONFLICT (k) DO NOTHING",
                (salt,)
            )
            cur.execute("SELECT COUNT(*) FROM docs WHERE kind = 'company'")
            count = cur.fetchone()[0]
            if count == 0:
                now = int(time.time())
                for c in SEED_COMPANIES:
                    cur.execute(
                        "INSERT INTO docs(kind, id, json, updated_at) VALUES ('company', %s, %s, %s) "
                        "ON CONFLICT (kind, id) DO NOTHING",
                        (c['id'], json.dumps(c, ensure_ascii=False), now)
                    )
                cur.execute(
                    "INSERT INTO docs(kind, id, json, updated_at) VALUES ('setting', 'main', %s, %s) "
                    "ON CONFLICT (kind, id) DO NOTHING",
                    (json.dumps(SEED_SETTINGS, ensure_ascii=False), now)
                )
                cur.execute(
                    "INSERT INTO meta(k, v) VALUES ('rev', '1') ON CONFLICT (k) DO NOTHING"
                )
                print('[i] Archives PostgreSQL initialisées (2 sociétés).')
        self._run(_init)

    def backup_on_start(self):
        # Sur PostgreSQL (Render), la persistance est assurée par la base dédiée
        pass

    @staticmethod
    def _bump(cur):
        cur.execute("""
            INSERT INTO meta(k, v) VALUES ('rev', '1')
            ON CONFLICT (k) DO UPDATE SET v = (COALESCE(NULLIF(meta.v, '')::BIGINT, 0) + 1)::TEXT
            RETURNING v
        """)
        row = cur.fetchone()
        return int(row[0]) if row else 1

    def get_meta(self, key, default=''):
        def _op(cur):
            cur.execute("SELECT v FROM meta WHERE k = %s", (key,))
            row = cur.fetchone()
            return row[0] if row and row[0] is not None else default
        return self._run(_op)

    def revoke_nonce(self, nonce, exp):
        def _op(cur):
            now = int(time.time())
            cur.execute("DELETE FROM revoked_sessions WHERE exp < %s", (now,))
            cur.execute(
                "INSERT INTO revoked_sessions(nonce, exp) VALUES (%s, %s) ON CONFLICT (nonce) DO NOTHING",
                (nonce, int(exp))
            )
        self._run(_op)

    def is_nonce_revoked(self, nonce):
        def _op(cur):
            cur.execute("SELECT 1 FROM revoked_sessions WHERE nonce = %s AND exp >= %s", (nonce, int(time.time())))
            return cur.fetchone() is not None
        return self._run(_op)

    def rev(self):
        val = self.get_meta('rev', '0')
        try:
            return int(val)
        except ValueError:
            return 0

    def state(self):
        def _op(cur):
            out = _empty_state()
            cur.execute("SELECT kind, id, json FROM docs")
            for kind, doc_id, raw_json in cur.fetchall():
                data = json.loads(raw_json)
                if kind == 'setting' and doc_id == 'main':
                    out['settings'].update(data)
                elif kind in DOC_KIND_MAP:
                    out[DOC_KIND_MAP[kind]].append(data)
            cur.execute("SELECT name, value FROM counters")
            for name, val in cur.fetchall():
                out['counter'][name] = int(val)
            cur.execute("SELECT v FROM meta WHERE k = 'rev'")
            r = cur.fetchone()
            out['rev'] = int(r[0]) if r and r[0] else 0
            return _sort_state(out)
        return self._run(_op)

    def upsert(self, kind, data):
        if kind not in DOC_KIND_MAP:
            raise ValueError('kind invalide')
        data = dict(data or {})
        if not data.get('id'):
            data['id'] = _new_doc_id()

        def _op(cur):
            cur.execute(
                "INSERT INTO docs(kind, id, json, updated_at) VALUES (%s, %s, %s, %s) "
                "ON CONFLICT (kind, id) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at",
                (kind, data['id'], json.dumps(data, ensure_ascii=False), int(time.time()))
            )
            rev = self._bump(cur)
            return data, rev
        return self._run(_op)

    def delete(self, kind, doc_id):
        def _op(cur):
            cur.execute("DELETE FROM docs WHERE kind = %s AND id = %s", (kind, doc_id))
            return self._bump(cur)
        return self._run(_op)

    def patch_settings(self, patch):
        def _op(cur):
            cur.execute("SELECT json FROM docs WHERE kind = 'setting' AND id = 'main' FOR UPDATE")
            row = cur.fetchone()
            cur_settings = json.loads(row[0]) if row else dict(SEED_SETTINGS)
            cur_settings.update(patch or {})
            cur.execute(
                "INSERT INTO docs(kind, id, json, updated_at) VALUES ('setting', 'main', %s, %s) "
                "ON CONFLICT (kind, id) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at",
                (json.dumps(cur_settings, ensure_ascii=False), int(time.time()))
            )
            rev = self._bump(cur)
            return cur_settings, rev
        return self._run(_op)

    def next_counter(self, name, consume=True):
        def _op(cur):
            if consume:
                cur.execute(
                    "INSERT INTO counters(name, value) VALUES (%s, 1) "
                    "ON CONFLICT (name) DO UPDATE SET value = counters.value + 1 "
                    "RETURNING value",
                    (name,)
                )
                return int(cur.fetchone()[0])
            cur.execute("SELECT value FROM counters WHERE name = %s", (name,))
            row = cur.fetchone()
            return (int(row[0]) if row else 0) + 1
        return self._run(_op)

    def replace_all(self, payload):
        payload = payload or {}
        counters = _extract_counters_from_payload(payload)

        def _op(cur):
            cur.execute("DELETE FROM docs")
            cur.execute("DELETE FROM counters")
            now = int(time.time())
            for kind, key in DOC_KIND_MAP.items():
                for item in payload.get(key) or []:
                    item = dict(item)
                    item.setdefault('id', _new_doc_id())
                    cur.execute(
                        "INSERT INTO docs(kind, id, json, updated_at) VALUES (%s, %s, %s, %s) "
                        "ON CONFLICT (kind, id) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at",
                        (kind, item['id'], json.dumps(item, ensure_ascii=False), now)
                    )
            settings = dict(SEED_SETTINGS)
            settings.update(payload.get('settings') or {})
            cur.execute(
                "INSERT INTO docs(kind, id, json, updated_at) VALUES ('setting', 'main', %s, %s)",
                (json.dumps(settings, ensure_ascii=False), now)
            )
            for cname, cval in counters.items():
                cur.execute(
                    "INSERT INTO counters(name, value) VALUES (%s, %s) "
                    "ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value",
                    (cname, int(cval))
                )
            return self._bump(cur)
        return self._run(_op)

    def wipe(self):
        def _op(cur):
            cur.execute("DELETE FROM docs")
            cur.execute("DELETE FROM counters")
            now = int(time.time())
            for c in SEED_COMPANIES:
                cur.execute(
                    "INSERT INTO docs(kind, id, json, updated_at) VALUES ('company', %s, %s, %s)",
                    (c['id'], json.dumps(c, ensure_ascii=False), now)
                )
            cur.execute(
                "INSERT INTO docs(kind, id, json, updated_at) VALUES ('setting', 'main', %s, %s)",
                (json.dumps(SEED_SETTINGS, ensure_ascii=False), now)
            )
            return self._bump(cur)
        return self._run(_op)


# ============================================================
#  Base de données SQLite (mode bureau local)
# ============================================================
class SQLiteStore:
    engine = 'sqlite'

    def __init__(self, path):
        self.path = path
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
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
                con.execute("CREATE TABLE IF NOT EXISTS revoked_sessions(nonce TEXT PRIMARY KEY, exp INTEGER NOT NULL)")
                salt = base64.urlsafe_b64encode(os.urandom(32)).decode('ascii').rstrip('=')
                con.execute("INSERT OR IGNORE INTO meta(k,v) VALUES('session_salt',?)", (salt,))
                row = con.execute("SELECT COUNT(*) c FROM docs WHERE kind='company'").fetchone()
                if row['c'] == 0:
                    now = int(time.time())
                    for c in SEED_COMPANIES:
                        con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('company',?,?,?)",
                                    (c['id'], json.dumps(c, ensure_ascii=False), now))
                    con.execute("INSERT INTO docs(kind,id,json,updated_at) VALUES('setting','main',?,?)",
                                (json.dumps(SEED_SETTINGS, ensure_ascii=False), now))
                    con.execute("INSERT OR REPLACE INTO meta(k,v) VALUES('rev','1')")
                    print('[i] Archives SQLite initialisées (2 sociétés).')
                con.commit()
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

    def _bump(self, con):
        con.execute("INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT)")
        r = con.execute("SELECT v FROM meta WHERE k='rev'").fetchone()
        return int(r['v']) if r else 0

    def get_meta(self, key, default=''):
        with self.lock:
            con = self.connect()
            try:
                r = con.execute("SELECT v FROM meta WHERE k=?", (key,)).fetchone()
                return r['v'] if r and r['v'] is not None else default
            finally:
                con.close()

    def revoke_nonce(self, nonce, exp):
        with self.lock:
            con = self.connect()
            try:
                con.execute("DELETE FROM revoked_sessions WHERE exp < ?", (int(time.time()),))
                con.execute("INSERT OR IGNORE INTO revoked_sessions(nonce, exp) VALUES(?, ?)", (nonce, int(exp)))
                con.commit()
            finally:
                con.close()

    def is_nonce_revoked(self, nonce):
        with self.lock:
            con = self.connect()
            try:
                r = con.execute(
                    "SELECT 1 FROM revoked_sessions WHERE nonce=? AND exp>=?",
                    (nonce, int(time.time()))
                ).fetchone()
                return r is not None
            finally:
                con.close()

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
                out = _empty_state()
                for row in con.execute("SELECT kind,id,json FROM docs"):
                    data = json.loads(row['json'])
                    k = row['kind']
                    if k == 'setting' and row['id'] == 'main':
                        out['settings'].update(data)
                    elif k in DOC_KIND_MAP:
                        out[DOC_KIND_MAP[k]].append(data)
                for crow in con.execute("SELECT name, value FROM counters"):
                    out['counter'][crow['name']] = int(crow['value'])
                r = con.execute("SELECT v FROM meta WHERE k='rev'").fetchone()
                out['rev'] = int(r['v']) if r else 0
                return _sort_state(out)
            finally:
                con.close()

    def upsert(self, kind, data):
        if kind not in DOC_KIND_MAP:
            raise ValueError('kind invalide')
        data = dict(data or {})
        if not data.get('id'):
            data['id'] = _new_doc_id()
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
        payload = payload or {}
        counters = _extract_counters_from_payload(payload)
        with self.lock:
            con = self.connect()
            try:
                con.execute("DELETE FROM docs")
                con.execute("DELETE FROM counters")
                now = int(time.time())
                for kind, key in DOC_KIND_MAP.items():
                    for item in payload.get(key) or []:
                        item = dict(item)
                        item.setdefault('id', _new_doc_id())
                        con.execute("INSERT OR REPLACE INTO docs(kind,id,json,updated_at) VALUES(?,?,?,?)",
                                    (kind, item['id'], json.dumps(item, ensure_ascii=False), now))
                settings = dict(SEED_SETTINGS)
                settings.update(payload.get('settings') or {})
                con.execute("INSERT OR REPLACE INTO docs(kind,id,json,updated_at) VALUES('setting','main',?,?)",
                            (json.dumps(settings, ensure_ascii=False), now))
                for cname, cval in counters.items():
                    con.execute("INSERT OR REPLACE INTO counters(name, value) VALUES(?, ?)", (cname, int(cval)))
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


# Alias rétrocompatible
Store = SQLiteStore


REF_DEFAULT = '{c}/{t}/{y}/{n:04d}'


def render_ref(pattern, c='', t='', y=None, m=None, n=1):
    """Rend un motif de numérotation identique à celui de l'application."""
    y = y or datetime.now().year
    m = m or datetime.now().month
    out = str(pattern or REF_DEFAULT)
    out = out.replace('{c}', str(c)).replace('{t}', str(t))
    out = out.replace('{y}', str(y)).replace('{yy}', str(y)[-2:])
    out = out.replace('{mm}', str(m).zfill(2))
    out = re.sub(r'\{n(?::0?(\d+)d)?\}',
                 lambda mo: str(n).zfill(int(mo.group(1))) if mo.group(1) else str(n), out)
    return out


# ============================================================
#  Sécurité : mot de passe, sessions signées & anti-force brute
# ============================================================
PBKDF2_PREFIX = 'pbkdf2_sha256$'
PBKDF2_ITERATIONS = 260000

try:
    SESSION_TTL = max(300, int(float(os.environ.get('SESSION_TTL_HOURS', '12')) * 3600))
except ValueError:
    SESSION_TTL = 12 * 3600

LOGIN_WINDOW_SEC = 300       # fenêtre de 5 minutes
LOGIN_MAX_ATTEMPTS = 5       # max 5 échecs par IP sur 5 minutes
_FAILED_LOGINS = {}          # ip -> [timestamps]
_REVOKED_CACHE = {}          # nonce -> exp
_auth_lock = threading.Lock()
_SESSION_SALT_CACHE = None


def hash_password(plain_password, iterations=PBKDF2_ITERATIONS):
    """Génère une empreinte PBKDF2-HMAC-SHA256 sûre à stocker."""
    salt = base64.urlsafe_b64encode(os.urandom(16)).decode('ascii').rstrip('=')
    dk = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('ascii'), iterations)
    return '%s%d$%s$%s' % (PBKDF2_PREFIX, iterations, salt, dk.hex())


def _configured_secret():
    """Retourne le mot de passe ou hash configuré (env prioritaire sur config.json)."""
    return (
        os.environ.get('APP_PASSWORD_HASH')
        or os.environ.get('APP_PASSWORD')
        or os.environ.get('SECRETARIAT_PASSWORD')
        or CFG.get('password')
        or ''
    ).strip()


def auth_required():
    return bool(_configured_secret())


def check_password(candidate):
    secret = _configured_secret()
    if not secret:
        return True
    pw = (candidate or '').encode('utf-8')
    if secret.startswith(PBKDF2_PREFIX):
        try:
            _, iter_str, salt, expected_hex = secret.split('$', 3)
            dk = hashlib.pbkdf2_hmac('sha256', pw, salt.encode('ascii'), int(iter_str))
            return hmac.compare_digest(dk.hex(), expected_hex.lower())
        except Exception:
            return False
    # Comparaison en temps constant sur condensats SHA-256 (ne révèle ni contenu ni longueur)
    d_pw = hashlib.sha256(pw).digest()
    d_expected = hashlib.sha256(secret.encode('utf-8')).digest()
    return hmac.compare_digest(d_pw, d_expected)


def _signing_key(store):
    global _SESSION_SALT_CACHE
    if _SESSION_SALT_CACHE is None:
        _SESSION_SALT_CACHE = store.get_meta('session_salt', 'default-salt')
    env_secret = os.environ.get('SESSION_SECRET') or ''
    pw_fp = hashlib.sha256(_configured_secret().encode('utf-8')).hexdigest()
    raw = '%s|%s|%s' % (env_secret, _SESSION_SALT_CACHE, pw_fp)
    return hashlib.sha256(raw.encode('utf-8')).digest()


def new_session(store):
    """Crée un jeton de session signé HMAC-SHA256 (survit aux redémarrages Render)."""
    exp = int(time.time()) + SESSION_TTL
    nonce = base64.urlsafe_b64encode(os.urandom(16)).decode('ascii').rstrip('=')
    payload = '%d.%s' % (exp, nonce)
    sig = base64.urlsafe_b64encode(
        hmac.new(_signing_key(store), payload.encode('ascii'), hashlib.sha256).digest()
    ).decode('ascii').rstrip('=')
    return '%s.%s' % (payload, sig)


def _parse_and_verify_token(token, store):
    if not token or token.count('.') != 2:
        return None
    exp_str, nonce, sig = token.split('.', 2)
    try:
        exp = int(exp_str)
    except ValueError:
        return None
    if exp < int(time.time()):
        return None
    payload = '%s.%s' % (exp_str, nonce)
    expected_sig = base64.urlsafe_b64encode(
        hmac.new(_signing_key(store), payload.encode('ascii'), hashlib.sha256).digest()
    ).decode('ascii').rstrip('=')
    if not hmac.compare_digest(sig, expected_sig):
        return None
    return exp, nonce


def session_valid(token, store):
    parsed = _parse_and_verify_token(token, store)
    if not parsed:
        return False
    exp, nonce = parsed
    now = time.time()
    with _auth_lock:
        rev_exp = _REVOKED_CACHE.get(nonce)
        if rev_exp:
            if rev_exp >= now:
                return False
            _REVOKED_CACHE.pop(nonce, None)
    try:
        if store.is_nonce_revoked(nonce):
            with _auth_lock:
                _REVOKED_CACHE[nonce] = exp
            return False
    except Exception:
        pass
    return True


def revoke_session(token, store):
    parsed = _parse_and_verify_token(token, store)
    if not parsed:
        return
    exp, nonce = parsed
    with _auth_lock:
        _REVOKED_CACHE[nonce] = exp
    try:
        store.revoke_nonce(nonce, exp)
    except Exception:
        pass


def check_rate_limit(ip):
    """Retourne True si l'IP est autorisée à tenter une connexion, False si bloquée."""
    now = time.time()
    cutoff = now - LOGIN_WINDOW_SEC
    with _auth_lock:
        if len(_FAILED_LOGINS) > 2000:
            for k in list(_FAILED_LOGINS.keys()):
                pts = [t for t in _FAILED_LOGINS[k] if t > cutoff]
                if pts:
                    _FAILED_LOGINS[k] = pts
                else:
                    _FAILED_LOGINS.pop(k, None)
        pts = [t for t in _FAILED_LOGINS.get(ip, []) if t > cutoff]
        _FAILED_LOGINS[ip] = pts
        return len(pts) < LOGIN_MAX_ATTEMPTS


def record_login_result(ip, success):
    now = time.time()
    cutoff = now - LOGIN_WINDOW_SEC
    with _auth_lock:
        if success:
            _FAILED_LOGINS.pop(ip, None)
        else:
            pts = [t for t in _FAILED_LOGINS.get(ip, []) if t > cutoff]
            pts.append(now)
            _FAILED_LOGINS[ip] = pts


# ============================================================
#  Initialisation du magasin de données actif
# ============================================================
_raw_db = os.environ.get('DB_PATH') or CFG['db']
DB_PATH = _raw_db if os.path.isabs(_raw_db) else os.path.join(APP_DIR, _raw_db)
STORE = None


def init_store():
    global STORE
    if DATABASE_URL:
        STORE = PostgresStore(DATABASE_URL)
    else:
        STORE = SQLiteStore(DB_PATH)
    return STORE


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


def _web_update_allowed():
    if os.environ.get('ALLOW_WEB_UPDATE') == '1':
        return True
    return not IS_CLOUD


class Handler(SimpleHTTPRequestHandler):
    server_version = 'Secretariat/' + APP_VERSION
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    # ---------- utilitaires ----------
    def log_message(self, fmt, *args):
        if '/api/rev' in (self.path or '') or '/api/health' in (self.path or ''):
            return
        sys.stdout.write('%s  %s\n' % (time.strftime('%H:%M:%S'), fmt % args))

    def _client_ip(self):
        xff = (self.headers.get('X-Forwarded-For') or '').strip()
        if xff:
            return xff.split(',')[0].strip()
        return self.client_address[0] if self.client_address else 'unknown'

    def _is_https(self):
        proto = (self.headers.get('X-Forwarded-Proto') or '').lower()
        return proto == 'https' or bool(os.environ.get('RENDER'))

    def _security_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Referrer-Policy', 'same-origin')

    def _json(self, obj, code=200, headers=None):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self._security_headers()
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def _read_json(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0 or n > 25 * 1024 * 1024:
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
        return session_valid(self._cookie_token(), STORE)

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
        rel = urllib.parse.unquote(path.lstrip('/')).replace('\\', '/')
        parts = [p for p in rel.split('/') if p]
        if not parts:
            rel = 'index.html'
            parts = ['index.html']
        # Bloquer tout fichier caché (.git, .env, etc.) et les fichiers serveur/base
        if any(p.startswith('.') for p in parts):
            return self._json({'error': 'forbidden'}, 403)
        if any(rel.startswith(pref) for pref in FORBIDDEN_PREFIXES):
            return self._json({'error': 'forbidden'}, 403)
        if rel in FORBIDDEN_FILES or rel.lower().endswith(FORBIDDEN_EXTS):
            return self._json({'error': 'forbidden'}, 403)

        full = os.path.normpath(os.path.join(APP_DIR, rel))
        if os.path.commonpath([APP_DIR, full]) != APP_DIR or not os.path.isfile(full):
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
        self.send_header('Cache-Control', 'no-cache' if ext in ('.html', '.js', '.css') else 'max-age=3600')
        self._security_headers()
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    # ---------- API GET ----------
    def api_get(self, path, qs):
        if path == '/api/health':
            authed = self._authed()
            return self._json({
                'ok': True,
                'app': 'secretariat',
                'version': APP_VERSION,
                'mode': 'server',
                'storage': STORE.engine,
                'cloud': IS_CLOUD,
                'needsLogin': auth_required(),
                'authed': authed,
                'rev': STORE.rev() if authed else 0,
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
            self._security_headers()
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
            ip = self._client_ip()
            if not check_rate_limit(ip):
                return self._json({
                    'ok': False,
                    'error': 'محاولات كثيرة جداً — يرجى الانتظار 5 دقائق قبل المحاولة مجدداً'
                }, 429)
            data = self._read_json()
            if not auth_required():
                return self._json({'ok': True, 'authed': True})
            if check_password(data.get('password')):
                record_login_result(ip, True)
                token = new_session(STORE)
                cookie = 'sirr_sid=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=Lax' % (token, SESSION_TTL)
                if self._is_https():
                    cookie += '; Secure'
                return self._json({'ok': True, 'authed': True}, headers={'Set-Cookie': cookie})
            record_login_result(ip, False)
            time.sleep(0.4)
            return self._json({'ok': False, 'error': 'كلمة المرور غير صحيحة'}, 401)

        if path == '/api/logout':
            token = self._cookie_token()
            if token:
                revoke_session(token, STORE)
            cookie = 'sirr_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
            if self._is_https():
                cookie += '; Secure'
            return self._json({'ok': True}, headers={'Set-Cookie': cookie})

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
            if not _web_update_allowed():
                return self._json({
                    'error': 'التحديث عبر الملفات معطّل على السحابة — يتم التحديث تلقائياً عبر GitHub / Render'
                }, 403)
            return self.api_update()

        if path == '/api/restart':
            if not _web_update_allowed():
                return self._json({'error': 'إعادة التشغيل اليدوية معطّلة على السحابة'}, 403)
            return self.api_restart()

        if path == '/api/wipe':
            return self._json({'ok': True, 'rev': STORE.wipe()})

        return self._json({'error': 'not found'}, 404)

    # ---------- Mise à jour locale de l'application ----------
    def api_update(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 60 * 1024 * 1024:
            return self._json({'error': 'حجم الملف غير صالح'}, 400)
        raw = self.rfile.read(n)
        name = urllib.parse.unquote(self.headers.get('X-Filename') or 'update.zip')
        is_zip = name.lower().endswith('.zip') or raw[:2] == b'PK'

        updated, skipped = [], []
        os.makedirs(APP_BACKUP_DIR, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d-%H%M%S')

        def install(fname, data):
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
                zf = zipfile.ZipFile(io.BytesIO(raw))
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
                    install(base, zf.read(info))
            else:
                install(name, raw)
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


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] == '--hash-password':
        pw = argv[1] if len(argv) > 1 else getpass.getpass('Mot de passe : ')
        if not pw:
            print('Erreur : mot de passe vide.', file=sys.stderr)
            return 1
        print(hash_password(pw))
        return 0

    init_store()

    host = os.environ.get('HOST') or CFG.get('host', '0.0.0.0')
    port = int(os.environ.get('PORT') or CFG.get('port', 8080))
    try:
        httpd = ThreadingHTTPServer((host, port), Handler)
    except OSError as e:
        print('[!] Impossible d\'ouvrir le port %d : %s' % (port, e))
        print('    → fermez l\'autre programme, ou changez "port" dans config.json')
        if sys.stdin and sys.stdin.isatty():
            input('Appuyez sur Entrée pour fermer...')
        return 1
    httpd.daemon_threads = True

    print('=' * 60)
    print('  نظام المراسلات والسكرتارية — الأرشيف المشترك')
    print('=' * 60)
    if STORE.engine == 'postgres':
        print('  Moteur de base  : PostgreSQL (persistant — Render / Cloud)')
    else:
        print('  Base de données : %s (SQLite local)' % DB_PATH)
    if auth_required():
        print('  Mot de passe    : مفعّل (محمي بكلمة مرور)')
    else:
        print('  Mot de passe    : غير مفعّل — الوصول مفتوح!')
        if IS_CLOUD:
            print('  [!] CONSEIL RENDER : définissez la variable APP_PASSWORD dans Environment !')
    print('')
    print('  على هذا الجهاز  : http://localhost:%d/' % port)
    if not IS_CLOUD:
        for ip in local_ips():
            print('  من أجهزة أخرى  : http://%s:%d/' % (ip, port))
    print('=' * 60)
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n[i] إيقاف الخادم...')
    finally:
        httpd.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
