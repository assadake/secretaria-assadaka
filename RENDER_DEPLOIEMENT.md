# Déployer l'application sur Render avec Supabase

La base de données partagée est hébergée sur **Supabase PostgreSQL** ; Render ne stocke que le serveur Python. Le guide complet de configuration, de sécurité et de transfert des archives est dans [`SUPABASE_DEPLOIEMENT.md`](SUPABASE_DEPLOIEMENT.md).

## Configuration Render

1. Créez le Web Service depuis ce dépôt (runtime Python).
2. Commande de construction : `pip install -r requirements.txt`.
3. Commande de démarrage : `python server.py`.
4. Définissez ces variables dans **Environment** :
   - `DATABASE_URL` : chaîne PostgreSQL **Session pooler** de Supabase ;
   - `APP_PASSWORD` : mot de passe fort pour protéger l'application ;
   - `SESSION_SECRET` : secret aléatoire (peut être généré par Render).
5. Déployez et vérifiez `GET /api/health` : `storage` doit valoir `postgres`.

`render.yaml` configure les variables nécessaires, mais ne contient aucune chaîne de connexion ni aucun mot de passe. Si `DATABASE_URL` est absent sur Render, le serveur s'arrête au lieu d'utiliser le disque éphémère de l'hébergeur.

## Attention aux données existantes

Avant la mise en service, exportez l'archive de l'ancien serveur en JSON, puis importez-la dans l'application connectée à Supabase. L'import remplace la base courante : faites une sauvegarde préalable. Voir le guide Supabase pour les étapes détaillées.
