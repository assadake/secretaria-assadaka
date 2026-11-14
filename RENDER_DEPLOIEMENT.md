# Déployer sur Render (Offre Gratuite) avec PostgreSQL + Mot de passe sécurisé

Avec cette configuration, toutes vos lettres, sociétés, employés et numéros de référence sont enregistrés dans **Render Postgres** (base de données dédiée) et **ne sont pas perdus** lorsque le service gratuit Render se met en veille ou redémarre.

---

## Méthode A (la plus simple — automatique en 1 clic) : **`Blueprint`**

Dans votre tableau de bord Render, cliquez sur **`+ New`** (en haut à droite) puis choisissez **`Blueprint`** (tout en bas du menu) :

1. Connectez votre dépôt GitHub **`assadake/secretaria-assadaka`** (assurez-vous que ces modifications sont fusionnées sur `main`).
2. Render lit automatiquement le fichier **`render.yaml`** et prépare pour vous :
   - La base de données gratuite **`secretariat-assadaka-db`** (PostgreSQL Free)
   - Le serveur gratuit **`secretariat-assadaka`** (Web Service Python Free)
   - La clé secrète de session **`SESSION_SECRET`** (générée automatiquement)
3. Render vous demande uniquement de remplir **`APP_PASSWORD`** :
   - Choisissez un **mot de passe solide** (ex. `Assadaka-2026!Secret`) — il sera chiffré dans Render et ne figurera jamais sur GitHub.
4. Cliquez sur **`Apply`** / **`Deploy`**.
5. Après 2 minutes, ouvrez votre lien `https://secretariat-assadaka.onrender.com` → entrez votre mot de passe → le badge vert **« ● أرشيف مشترك — متصل »** s'affiche !

---

## Méthode B (manuelle) : **`Postgres`** puis **`Web Service`**

Si vous préférez créer les services séparément depuis le menu **`+ New`** :

### Étape 1 : Créer la base PostgreSQL gratuite
1. Cliquez sur **`+ New`** → **`Postgres`**.
2. **Name** : `secretariat-db`
3. **Instance Type** : **`Free`** ($0/month) → cliquez **`Create Database`**.
4. Une fois créée, copiez l'**`Internal Database URL`** (qui commence par `postgresql://...`).

### Étape 2 : Créer le Web Service gratuit
1. Cliquez sur **`+ New`** → **`Web Service`**.
2. Sélectionnez votre dépôt GitHub **`assadake/secretaria-assadaka`**.
3. Vérifiez les réglages :
   - **Language** : `Python 3`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `python server.py`
   - **Instance Type** : **`Free`** ($0/month)
4. Dans **Environment Variables**, ajoutez :
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Collez l'*Internal Database URL* copiée à l'étape 1 |
   | `APP_PASSWORD` | Votre mot de passe secret (ex. `Assadaka-2026!Secret`) |
   | `SESSION_SECRET` | Une phrase aléatoire longue (ex. 30 caractères au hasard) |
5. Cliquez sur **`Deploy Web Service`**.

---

## Sécurité intégrée

- **Mot de passe chiffré côté serveur** : comparaison en temps constant (ou empreinte `PBKDF2-SHA256` via `APP_PASSWORD_HASH`).
- **Protection anti-force brute** : blocage automatique après 5 tentatives erronées en 5 minutes par adresse IP.
- **Sessions signées persistantes (`HMAC-SHA256`, `HttpOnly`, `Secure`)** : même si le serveur gratuit Render se met en veille après 15 min d'inactivité, votre session reste ouverte pendant 12 h sans redemander le mot de passe, et le bouton **🔒 خروج** en haut permet de verrouiller un poste immédiatement.
- **Fichiers sensibles protégés** : aucun accès public possible à `server.py`, `config.json`, `.git`, etc.

---

## ⚠️ Rappel important sur l'offre Gratuite de Render Postgres

1. **Mise en veille du Web Service** : après 15 minutes sans visite, Render met le serveur en pause ; la première ouverture du matin prend environ **30 secondes** à charger, puis tout est instantané. **Aucune donnée n'est perdue** car elles sont dans PostgreSQL.
2. **Durée de la base Postgres gratuite Render (30 jours)** : chez Render, une base PostgreSQL *Free* expire au bout de **30 jours** (Render vous prévient par e-mail avant).
   - **Astuce 1 (Sauvegarde 1 clic)** : allez dans **⚙️ الإعدادات → ⬇ تصدير نسخة احتياطية (JSON)** une fois par semaine ; si la base expire, recréez une base gratuite et cliquez **⬆ استيراد نسخة احتياطية** (toutes les lettres et tous les compteurs sont restaurés).
   - **Astuce 2 (PostgreSQL gratuit sans limite de 30 jours)** : vous pouvez aussi créer une base PostgreSQL gratuite permanente sur **Neon.tech** ou **Supabase** et coller son lien `postgresql://...` dans `DATABASE_URL` sur Render — `server.py` est déjà 100 % compatible !
