# Base de données Supabase — Secrétariat Assedaka

L'application utilise maintenant PostgreSQL sur Supabase pour l'archive partagée. Le serveur Python se connecte directement à PostgreSQL avec `DATABASE_URL` ; aucune clé `anon` ou clé `service_role` Supabase ne doit être mise dans le navigateur.

## État de la configuration

- Projet Supabase préparé : **assadake's Project** (`rqbjwphzuxvsefpwqdqh`, région `eu-west-1`).
- Schéma privé créé : `secretariat`.
- Tables créées : `docs`, `counters`, `meta`, `revoked_sessions`.
- Les tables sont protégées par RLS et aucun accès n'est accordé aux rôles `anon` et `authenticated`. Seul le serveur, connecté avec le compte PostgreSQL, y accède.
- Le schéma est isolé de `public` et ne touche pas aux tables préexistantes du projet.
- `server.py` crée aussi ce schéma et ces tables au démarrage si nécessaire, puis initialise les sociétés et réglages par défaut.

La migration versionnée se trouve dans `supabase/migrations/202611150001_initial_secretariat_storage.sql`.

## Relier le serveur hébergé (Render)

1. Dans Supabase, ouvrez **Project Settings → Database → Connection string**.
2. Copiez l'URI PostgreSQL de **Session pooler** (adapté aux connexions de serveur persistantes). Ne la publiez pas et ne la mettez jamais dans Git.
3. Dans Render, ouvrez le Web Service `secretariat-assadaka` → **Environment** et définissez :
   - `DATABASE_URL` : URI de connexion copiée depuis Supabase ;
   - `APP_PASSWORD` : mot de passe long et unique pour l'accès à l'application ;
   - `SESSION_SECRET` : secret aléatoire long (Render peut le générer automatiquement).
4. Déclenchez un déploiement. Au démarrage, le serveur crée les tables (si elles n'existent pas) et le statut `GET /api/health` doit indiquer `storage: postgres`.

Le fichier `render.yaml` ne crée plus de base PostgreSQL Render : il demande la valeur de `DATABASE_URL` comme variable secrète à fournir. Si cette variable manque sur Render, le serveur échoue clairement au démarrage au lieu d'écrire dans un SQLite temporaire.

## Développement local avec Supabase (facultatif)

1. Copiez `.env.example` vers `.env` et renseignez `DATABASE_URL`, `APP_PASSWORD` et `SESSION_SECRET`.
2. Installez les dépendances avec `pip install -r requirements.txt`.
3. Lancez `python server.py`.

Le fichier `.env` est ignoré par Git. Ne collez jamais ici, dans un ticket ou dans le dépôt une URI contenant le mot de passe PostgreSQL.

## Transférer l'archive d'un ancien serveur

Le fichier `data/secretariat.db` présent dans ce dépôt ne contient que les deux sociétés et réglages par défaut, identiques aux valeurs d'initialisation Supabase. Aucune lettre ou fiche employé n'est à transférer depuis cette copie.

Pour transférer les données d'un vrai ancien serveur/local :

1. Sur l'ancien serveur, ouvrir **الإعدادات → تصدير نسخة احتياطية (JSON)** et conserver le fichier exporté hors du dépôt.
2. Déployer et ouvrir la nouvelle version connectée à Supabase.
3. Se connecter, puis choisir **الإعدادات → استيراد نسخة احتياطية** et sélectionner ce JSON.
4. Vérifier les lettres, employés et numéros de référence avant de reprendre le travail.

L'import remplace le contenu courant de l'archive Supabase : faire un export de sauvegarde avant toute restauration.

## Sauvegardes et sécurité

- Exporter régulièrement une sauvegarde JSON depuis l'application et la conserver dans un emplacement privé distinct de GitHub.
- Ne jamais utiliser une clé Supabase `anon` / `service_role` dans le JavaScript du navigateur.
- Ne pas exposer le schéma `secretariat` dans **API Settings → Exposed schemas**. Même en cas d'ajout ultérieur, les politiques RLS et les révocations bloquent les rôles navigateur.
- Le mot de passe d'accès à l'application (`APP_PASSWORD`) et le mot de passe PostgreSQL sont deux secrets distincts.
