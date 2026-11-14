# Archive partagée entre plusieurs postes (réseau du bureau)

Objectif : **une seule archive**, visible et modifiable depuis tous les PC du bureau, au lieu de copies séparées.

```
        ┌──────────────────────────┐
        │  PC « serveur » (bureau) │
        │  secretariat/server.py   │
        │  data/secretariat.db     │  ← la base commune (SQLite)
        └────────────┬─────────────┘
                     │ réseau local (câble / Wi-Fi)
      ┌──────────────┼───────────────┬──────────────┐
      │              │               │              │
   poste 1        poste 2          poste 3        poste 4
   navigateur     navigateur       navigateur     navigateur
        http://ADRESSE-DU-PC:8080/
```

---

## 1. Sur le PC « serveur » (un seul PC, allumé pendant les heures de travail)

1. **Installer Python** (une seule fois) : <https://www.python.org/downloads/> → cocher **« Add Python to PATH »**.
2. Copier le dossier de l'application sur ce PC, par exemple `C:\السكرتارية\` :
   ```
   server.py               ← le serveur d'archive partagée
   demarrer_serveur.bat    ← lanceur (double-clic)
   config.json             ← réglages (port, mot de passe, base)
   index.html              ← l'application
   secretariat.html        ← identique (mode fichier seul)
   data/                   ← créé automatiquement : base + sauvegardes
   ```
3. Double-cliquer **`demarrer_serveur.bat`**.
   La fenêtre noire affiche :
   ```
   على هذا الجهاز  : http://localhost:8080/
   من أجهزة أخرى  : http://192.168.1.20:8080/     ← notez cette adresse
   ```
4. **Laisser cette fenêtre ouverte** pendant les heures de travail (la fermer = serveur arrêté).

> Windows demandera peut-être d'**autoriser Python dans le pare-feu** : cliquez **Autoriser** (réseaux privés). Sans cela, les autres postes ne pourront pas se connecter.

## 2. Sur les autres postes (secrétaires, direction…)

Rien à installer : ouvrir un navigateur (Edge/Chrome) et aller à l'adresse affichée :

```
http://192.168.1.20:8080/
```

Astuce : créer un **raccourci sur le Bureau** vers cette adresse, renommé « السكرتارية ».
On peut aussi mettre ce raccourci en **page d'accueil** du navigateur.

## 3. Ce qui est partagé / comment ça se comporte

| Élément | Comportement |
|---|---|
| Lettres archivées | Commune à tous, immédiatement |
| Numérotation (رقم مرجعي) | **Attribuée par le serveur, sans doublon** même si deux personnes archivent au même instant |
| Employés, sociétés, préférences | Communs à tous |
| Bandeau en haut | « ● أرشيف مشترك — متصل » = connecté à l'archive commune |
| Travail simultané | Chaque poste peut saisir en même temps ; un poste qui n'est pas en train d'écrire se met à jour automatiquement (toutes les ~7 s) |
| Si quelqu'un enregistre pendant que vous rédigez | Votre formulaire n'est pas perturbé : le bandeau devient orange « ⟳ تحديثات جديدة » → cliquer dessus pour charger les nouveautés |
| Serveur arrêté | Message d'erreur à l'enregistrement ; relancer le serveur puis recharger la page |

## 4. Protéger l'accès par mot de passe (recommandé si le Wi-Fi est ouvert)

Ouvrir `config.json` sur le PC serveur et remplir :

```json
{
  "host": "0.0.0.0",
  "port": 8080,
  "password": "METTEZ-ICI-UN-MOT-DE-PASSE",
  "db": "data/secretariat.db",
  "backup_keep": 30
}
```

Puis **redémarrer le serveur**. Chaque poste verra un écran « 🔒 دخول الأرشيف المشترك » et devra saisir ce mot de passe une fois (session valable 12 h).

- `port` : à changer si le 8080 est déjà pris (ex. 8090).
- `backup_keep` : nombre de sauvegardes quotidiennes conservées.

## 5. Sauvegardes (important)

- Le serveur copie **automatiquement la base à chaque démarrage** dans `data/backups/` (les 30 dernières sont gardées).
- En plus, depuis l'application : **الإعدادات → تصدير نسخة احتياطية (JSON)** → télécharge tout l'archive.
  (En mode partagé, le fichier est généré **par le serveur** : il contient donc les données de tous les postes.)
- Restauration : **استيراد نسخة احتياطية** — en mode partagé, cela **remplace l'archive commune** (confirmation demandée).
- Sauvegarde conseillée : copier le dossier `data/` sur une clé USB ou le serveur de fichiers, une fois par semaine.

## 6. Mise à jour de l'application

> 📘 Détail complet : **`MISE_A_JOUR.md`**. Règle : **ne jamais tout remplacer**.

1. Arrêter le serveur (fermer la fenêtre ou `Ctrl+C`).
2. Copier `data/` par précaution.
3. Dézipper `secretariat_maj.zip` par-dessus : `index.html`, `secretariat.html`, `server.py`.
4. **Garder** `data/` et `config.json`.
5. Relancer `demarrer_serveur.bat`. Les postes n'ont qu'à faire **F5** (fichiers servis sans cache).

## 7. Dépannage

| Symptôme | Solution |
|---|---|
| « Impossible d'ouvrir le port 8080 » | Un autre programme utilise le port → changer `"port"` dans `config.json`, ou fermer l'ancienne fenêtre du serveur |
| Les autres postes ne se connectent pas | 1) même réseau Wi-Fi/câble ? 2) pare-feu Windows : autoriser Python (réseau privé) 3) tester `ping ADRESSE-DU-PC` |
| L'adresse IP change | Le PC serveur doit avoir une **IP fixe** (réservation DHCP dans le routeur) — sinon l'adresse change au redémarrage |
| Le badge reste gris « محلي » | La page a été ouverte en `file://` (double-clic) ou depuis un autre serveur → ouvrir via `http://ADRESSE:8080/` |
| « انتهت الجلسة » | Session de 12 h écoulée → ressaisir le mot de passe |
| Deux personnes, mêmes données ? | Oui, c'est le but. Le numéro de référence est attribué par le serveur : aucun doublon possible |

## 8. Limites à connaître

- **Pas de droits par utilisateur** : tous ceux qui ont l'accès (et le mot de passe) peuvent tout voir et tout modifier. Si vous voulez des rôles (سكرتير / مدير / اطلاع فقط), dites-le-moi : c'est une évolution possible.
- **Suppression** : un خطاب supprimé l'est pour tout le monde (les sauvegardes `data/backups/` permettent de revenir en arrière).
- Le PC serveur doit être **allumé** ; personne ne peut travailler tant qu'il est éteint (mais chaque poste garde la possibilité d'ouvrir `secretariat.html` en mode local autonome en cas d'urgence — attention, ce mode a sa propre archive séparée).

---

### Rappel des fichiers
| Fichier | Rôle |
|---|---|
| `server.py` | serveur d'archive partagée (Python standard, sans installation de paquets) |
| `demarrer_serveur.bat` | démarrage Windows en double-clic |
| `config.json` | port, mot de passe, base, sauvegardes |
| `index.html` / `secretariat.html` | l'application (identique) |
| `lancer_application.bat` | mode **local** sur un PC (sans partage) |
| `data/secretariat.db` | la base commune (créée au 1er démarrage) |
| `data/backups/` | sauvegardes automatiques |
