# Audit structurel & fonctionnel — نظام المراسلات والأرشفة (Secrétariat Assadaka)

**Version auditée :** 1.6.0 → **amelioration vers 1.7.0** · **Date :** 2026-11-15 · **Périmètre :** code source (`src/`), serveur (`server.py`), distribution (zip / Render / Supabase), données (SQLite/PostgreSQL), UX/accessibilité

---

## 1. Résumé exécutif

L'application est un **DMS (Document Management System) vertical** pour les secrétariats de la جنة/مجموعة الصداقة المثالية (AIS & AIS-BM) : rédaction de lettres sur papeterie officielle, numérotation automatique, archivage consultable, suivi des اعتمادات مستندية (crédits documentaires import), جداول متابعة (véhicules, licences, résidences, expéditions) et وثائق المجموعة.

Elle fait le pari rare — et pertinent pour un bureau libyen — de **fonctionner sans navigateur serveur complexe** : un unique `index.html` autonome (998 Ko, polices et images embarquées) utilisable en double-clic, **ou** un serveur Python maison (`server.py`, stdlib uniquement) donnant une archive partagée en LAN, sur SQLite, ou sur Supabase PostgreSQL pour le cloud (Render).

| Domaine | Avant (1.6.0) | Après audit (1.7.0) |
|---|---|---|
| Sécurité HTTP | 3 en-têtes (`nosniff`, `SAMEORIGIN`, `Referrer-Policy`) | + **CSP stricte**, `Permissions-Policy`, HSTS (HTTPS), cookie durci conservé |
| Protocole HTTP | Connexions keep-alive **parasitées** (400 aléatoire après `/api/logout`) | **Drainage du corps** → keep-alive sain, 0 400 parasite |
| Performance statique | Fichier 1 Mo re-téléchargé à chaque visite | **gzip (−44 %)** + **ETag/`304`** + `Last-Modified` |
| Action destructrice | `/api/wipe` = `{}` + double `confirm()` navigateur uniquement | **`confirm: "DELETE_ALL"` exigé côté serveur** |
| XSS / injection | Lien externe non filtré (`javascript:` possible), CSV exportable sans échappement de formule | `safeUrl()` (http/https/mailto uniquement), **CSV anti-formule (`'` =, +, -, @)** |
| Santé publique | `appMtime` + `version` exposés sans login | `appMtime`/`rev` réservés aux sessions authentifiées |
| Accessibilité | Menu en `<a>` sans `href` (non focalisable clavier) | `<button>` natifs, `aria-current`, skip-link, `:focus-visible`, `prefers-reduced-motion` |
| Métadonnées | Aucun description/favicon/theme-color | description, theme-color, favicon SVG, `document.title` par route |
| Qualité logicielle | Aucun test, aucune CI | **13 tests unitaires/intégration** (`tests/`), **CI GitHub Actions**, `build.py --check` impose la synchro `src/` ↔ HTML |
| Distribution | `secretariat_pc.zip` embarquait **`data/secretariat.db` + 5 sauvegardes + vieux backups app** | Zip **2,6 Mo nettoyé** (aucune donnée vivante), régénérable via `build.py --zip` |

**Note globale :** une application honnête et bien pensée pour son contexte, avec un vrai soin déjà présent (auth PBKDF2, sessions HMAC révocables, rate-limit login, CSP absente mais CSRF-light via SameSite=Lax, backup SQLite au démarrage). Les faiblesses majeures étaient **protocolaires (keep-alive), distributionnelles (zip avec DB) et de gouvernance (zéro test/CI)** — corrigées dans cette passe.

---

## 2. Cartographie du code

```
secretariat-assadaka/
├── src/                    # sources frontales (source of truth)
│   ├── index.html          # structure RTL, sidebar, topbar, #view, #printArea
│   ├── app.js   (1860 l.)  # état DB localStorage, sync API, dashboards, archive, settings
│   ├── templates.js (527 l.)# 17+ modèles de lettres (شهادات، RH، اعتمادات، وثائق المجموعة)
│   ├── credits.js (847 l.) # workflow LC 10 étapes, checklist 27 documents, calculs د.ل
│   ├── group.js (1533 l.)  # وثائق المجموعة + مرفقات base64 + impression papeterie
│   ├── style.css (795 l.)  # design system (navy/gold), A4 print, responsive
│   ├── assets.js           # images base64 (ترويسات AIS / AIS-BM)
│   └── cairo_embedded.css  # police Cairo embarquée (offline)
├── server.py   (1440 l.)   # ThreadingHTTPServer stdlib — zéro dépendance en mode SQLite
├── build.py                # src/ → index.html + secretariat.html (+ --check / --zip)
├── tests/test_server.py    # 13 tests (sécurité, API, build, versions)
├── .github/workflows/ci.yml
├── supabase/migrations/    # schéma `secretariat.*` (docs/counters/meta/revoked_sessions) + RLS
└── render.yaml             # déploiement Render (healthCheck /api/health)
```

**Modèle de données (dual store) :** table `docs(kind, id, json, updated_at)` — `letters | companies | employees | credits | group_doc | tracker` + `setting/main` — et compteurs de numérotation `counters(name = CODE|TPL|ANNÉE)`. Le back-end PostgreSQL re-signale `rev` global pour la détection de changements multi-postes (polling `/api/rev`, ~7 s).

---

## 3. Comparaison aux applications bien notées du domaine

| Application | Notoriété / note | Forces | Faiblesses vs ce projet |
|---|---|---|---|
| **Paperless-ngx** (GPL, Docker) | Référence archivage PME, 30k+ ⭐ | OCR, full-text search, auto-classification ML, tags | Orienté **scan entrant**, pas de rédaction sur papeterie, pas de compteurs de référence, pas d'LC bancaire, serveur Docker requis |
| **Mayan EDMS** (Apache-2.0) | EDMS enterprise, workflows | Versionning, signatures, audit trail, ACL granulaires | Très lourd pour un bureau de 3 secrétaires ; administration complexe |
| **Masar / منصة التراسل** (commercial LY/KSA) | Plateformes مراسلات الواردة/الصادرة | Workflow إداري, صلاحيات par rôle, تتبع زمني, تكامل ERP | Coût + licence + hébergement imposés ; boîte noire ; hors-ligne impossible |
| **AlMounkez (نظام إدارة الوثائق)** (commercial) | DMS عربي bureau classique | نماذج جاهزة, تعدد مستخدمين, صلاحيات | SQL Server requis, pas de version web moderne, mise à jour lourde |
| **نظام المراسلات (ce projet)** | usage réel AIS | **A4 papeterie parfaite, hors-ligne, dual SQLite/Supabase, prix 0, عربي RTL, contrôles métier LC/CBL** | Pas d'OCR/full-text search, pas de workflow d'approbation multi-niveaux, pas d'ACL par rôle, pas de signature électronique, pas d'historique de versions |

**Lecture honnête :** ce projet n'a pas vocation à remplacer un EDMS d'entreprise ; il bat les solutions commerciales arabes sur le terrain **papeterie + hors-ligne + zéro licence**, et perd logiquement face à Paperless-ngx sur la recherche plein-texte/OCR. Les deux mondes sont **complémentaires** (voir roadmap §7).

Constat des benchmarks publics (sources ci-dessous) : les DMS les mieux notés excellent sur 5 axes — **OCR/recherche, workflow d'approbation, audit trail, ACL, intégration**. Ce sont précisément les 5 axes absents ici.

---

## 4. Constats détaillés et correctifs appliqués

### 4.1 Sécurité
- ✅ **Keep-alive poisoning** : `/api/logout` et les `401` ne vidaient pas le corps → les octets restants (`{}`) étaient relus comme requête suivante → `400 Bad Request` parasite et connexion coupée. **Corrigé** (`_drain_body`, rejoue proprement la connexion ; vérifié en socket brut : la requête suivante sur la même connexion répond `200`).
- ✅ **`/api/wipe`** : suppression intégrale de l'archive protégée seulement par un `confirm()` navigateur (contournable). **Corrigé** : jeton serveur `confirm=DELETE_ALL` obligatoire (`400` sinon), désormais envoyé par le front.
- ✅ **CSP absente** → ajoutée (`default-src 'self'` + `object-src 'none'`, images/polices `data:` uniquement), plus `Permissions-Policy` restrictive, **HSTS** derrière proxy HTTPS, `appMtime` réservé aux authentifiés.
- ✅ **Lien externe non assaini** (`href="${esc(url)}"`) : un `javascript:` stocké dans le champ « الرابط الخارجي » s'exécutait au clic. **Corrigé** par `safeUrl()` (http/https/mailto seulement).
- ✅ **Injection de formule CSV** à l'export (cellules débutant par `=`, `+`, `-`, `@`, TAB) — vecteur classique vers Excel/LibreOffice. **Corrigé** (préfixe `'`).
- ✅ **Distribution** : le zip livré aux postes contenait la **base `data/secretariat.db` et 5 sauvegardes datées** (risque de fuite de données + écrasement local). **Corrigé** par régénération nettoyée (33 fichiers, exclusions strictes `data/`, `backups/`, `*.db`, `.env`).
- ⚠️ **Résiduel** : CSP avec `'unsafe-inline'` (imposé par le build single-file) ; mot de passe unique partagé (pas d'ACL par utilisateurs) ; pas de 2FA ; mises à jour in-app (`/api/update`) exécutant des fichiers remplacés (authentifié + désactivé en cloud, acceptable).

### 4.2 Architecture & code
- **Monolithe 1 Mo** assumé (distribution hors-ligne) — compromis sain ; compensé par gzip/304 côté serveur et by `build.py --check` en CI pour éviter toute dérive `src/` ↔ bundle.
- **Double moteur de stockage** (SQLite / PostgreSQL) : design propre (interface implicite), `RLock` + retry sur connexions mortes, compteurs atomiques `INSERT ... ON CONFLICT`. Bon niveau.
- **`localStorage`** en mode fichier : plafond ~5 Mo ; les مرفقات base64 des وثائق المجموعة peuvent le saturer → toast d'avertissement présent, mais un **compteur de quota** serait utile (voir roadmap).
- **30 assignations `innerHTML`** : majorité avec `esc()` ; les deux cas sans échappement étaient bénins (strings statiques) ; le flux de données utilisateur→HTML passe désormais par `esc()`/`safeUrl()` systématiquement.
- **Pas de source-map / pas de minification** — acceptable à cette échelle, à remier en question si le bundle dépasse 2 Mo.

### 4.3 Performance
- **Avant** : 1 058 550 octets re-téléchargés à chaque visite (`Cache-Control: no-cache` sans revalidation).
- **Après** : `Content-Encoding: gzip` → **591 184 octets (−44 %)**, `ETag` + `If-None-Match` → **304** (0 octet), `Last-Modified` en secours, `Vary: Accept-Encoding`, cache mémoire des gzip (clé `mtime+size`). Mesuré avec `curl` (§8).
- SQLite en `WAL` + `synchronous=NORMAL` : adéquat ; le backup-on-start double les écritures disque sur chaque lancement Windows — acceptable.

### 4.4 Correction / UX / accessibilité
- Menu latéral converti de `<a>` sans href (inaccessible clavier) en **`<button type="button">`** + `aria-current="page"` synchronisé à la route, **`document.title`** par page (ex. « الأرشيف — السكرتارية »).
- Ajout : **skip-link** « تخطي إلى المحتوى », focus visible doré, `prefers-reduced-motion`, favicon SVG embarqué, meta description/theme-color.
- RTL arabe natif conservé ; `dir="ltr"` correct sur IBAN/numéros ; impression A4 avec sauts de page par feuille (`@page`, masques `.no-print`).
- ⚠️ Résiduel : contrastes mid-gris (`#6c7789` sur blanc ≈ 4,6:1 — AA ok pour texte normal) ; toasts non annoncés aux lecteurs d'écran (`role="status"` à ajouter) ; tableaux sans tri clavier.

### 4.5 Qualité, tests, exploitation
- **Avant** : aucun test, aucune CI, aucun garde-fou de version (`version.json` / `APP_VERSION` / `APP_VER` désynchronisés possibles).
- **Après** : `tests/test_server.py` (13 tests : hash PBKDF2, session sign/revoke, `render_ref`, `_extract_counters_from_payload`, cohérence des 3 versions, fraîcheur du build, API réelle sur port éphémère : health, gzip+ETag/304, 403 `server.py`/`.env`/`.db`, compteurs, CRUD, wipe-guard, flux login complet avec cookie HttpOnly puis révocation), **CI** Python 3.10/3.12 : `py_compile`, `build.py --check`, suite de tests.
- **Observabilité** : logs stdout minimalistes ; pas de rotation. Recommandé : `python server.py >> data/server.log 2>&1` + logrotate (Linux) / planificateur (Windows).

---

## 5. Points forts à préserver
- Papeterie A4 **par entreprise** (2 ترويسات + علامة مائية), ajustement vertical auto (`adaptPadding`), impression navigateur fiable sans serveur.
- Numérotation `CODE/TPL/ANNÉE/####` transactionnelle (idempotente côté serveur), aperçu serveur avant émission, restauration des compteurs depuis exports JSON.
- Métier الاعتماد المستندي remarquablement fidèle au **مصرف ليبيا المركزي** (تغطية 100% بالدينار، موافقة كلية أو رفض، مهلة 60 يوماً للإقرار الجمركي، MT700/MT103، CBL Key) — différenciateur fort vs DMS génériques.
- Backup SQLite horodaté au démarrage (rétention 30), export/import JSON complet, mode Supabase avec schéma isolé `secretariat.*` + RLS (défense en profondeur).

## 6. Objectifs non tenus à arbitrer (hors scope de cette passe)
- Pas de suppression « النقاط الرمادية » légales : rétention légale, توقيع إلكتروني (قانون التوقيع الإلكتروني الليبي), piste d'audit immuable.
- Pas de multi-société strict en mode lecture publique : `/api/state` renvoie **toutes** les sociétés au poste authentifié (pas de filtrage par société/rôle).

## 7. Roadmap priorisée (impact / effort)

| Priorité | Chantier | Effort | Inspiration |
|---|---|---|---|
| P0 | **Audit trail** : journal `(qui, quoi, quand, rev)` table `audit` + vue « سجل الحركة » | 3 j | Mayan EDMS, Masar |
| P0 | **ACL légère** : 2–3 rôles (سكرتيرية / مدير / قارئ) + secret par rôle ; filtrage `/api/state` par société | 4 j | Masar, AlMounkez |
| P1 | **Pièces jointes aux lettres** (PDF/scan) + **paperless-ngx en complément** pour l'OCR des entrants ; liaison `letterId → document` | 5 j | Paperless-ngx |
| P1 | **Recherche plein-texte** (SQLite FTS5 sur ref/موضوع/الجهة + index JSONB PostgreSQL) | 2 j | Paperless-ngx |
| P1 | **Historique de versions** d'un document (diff JSON) | 3 j | Mayan |
| P2 | **PWA** : `manifest.webmanifest` + service-worker (cache offline du bundle) → installation « app » sur postes | 2 j | Nextcloud |
| P2 | **Toast `role=status`**, tri clavier des tableaux, contrastes AA+ sur `.badge.grey` | 1 j | WCAG 2.2 |
| P2 | **Dockerfile** + `docker-compose` (app + PostgreSQL local) pour quitter le modèle « PC serveur allumé » | 1 j | Paperless-ngx |
| P3 | Minification/bundling (esbuild) + suppression `'unsafe-inline'` via nonces CSP | 4 j | Pratique web moderne |
| P3 | Export PDF/A & archivage à valeur probante (horodatage RFC 3161) | 6 j | EDMS enterprise |

## 8. Vérifications exécutées (preuves)

```
$ python build.py --check        → index.html و secretariat.html متطابقتان مع src/
$ python -m unittest discover -s tests
Ran 13 tests in 1.04s — OK
$ curl -H 'Accept-Encoding: gzip' -I http://localhost:8080/
Content-Length: 591184   (brut 1 058 550 → −44 %)   Content-Encoding: gzip
ETag: W/"18e83d3ddcd41a6a-1026f6"   → If-None-Match → HTTP/1.1 304
Content-Security-Policy: default-src 'self'; ... object-src 'none' ...
Permissions-Policy: camera=(), microphone=(), geolocation=(), ...
$ curl -X POST -d '{}' /api/wipe        → 400 {"error":"تأكيد مطلوب..."}
$ curl /server.py /.env /data/secretariat.db → 403 / 403 / 403
$ python build.py --zip                 → secretariat_pc.zip 2,6 Mo, 33 ملف (sans data/ ni backups/)
```

## 9. Fichiers modifiés (1.6.0 → 1.7.0)

| Fichier | Changement |
|---|---|
| `server.py` | keep-alive drain, gzip + ETag/304, CSP/Permissions-Policy/HSTS, `/api/wipe` guard, `appMtime` réservé, wrapper d'erreur API (500 JSON au lieu de connexion coupée), version 1.7.0 |
| `src/index.html` | buttons natifs nav + skip-link + meta description/theme-color/favicon |
| `src/app.js` | CSV anti-formule, wipe token, `document.title` par route, `aria-current`, APP_VER 1.7.0 |
| `src/templates.js` | `safeUrl()` |
| `src/group.js` | lien externe via `safeUrl()` (+`rel="noopener noreferrer"`) |
| `src/style.css` | focus-visible gold, skip-link, reduced-motion, `.nav-item` |
| `version.json` | 1.7.0 |
| `build.py` | `--check` (CI) / `--zip` (distribution nettoyée) |
| `tests/test_server.py`, `.github/workflows/ci.yml` | nouveau — 13 tests + CI |
| `secretariat_pc.zip` | régénéré proprement |

## Sources (benchmark DMS)
[1] Open Source Document Management System: Best Options in 2026 — filently.com · [2] Open-Source AI Document Management Software — layer3labs.io · [3] 9 Open Source Document Management Systems — ones.com · [4] Masar — نظام الإدارة الإلكترونية للمراسلات والمعاملات · [5] AlMounkez — نظام إدارة الوثائق وأرشفتها
