# Mettre à jour l'application — que remplacer exactement ?

> 💡 **Il existe plus simple : la mise à jour depuis l'application elle-même.**
> Voir **`MISE_A_JOUR_FACILE.md`** — glisser-déposer du ZIP dans ⚙️ الإعدادات → 🔄 تحديث التطبيق.
> Le présent document décrit la méthode manuelle (utile une seule fois, pour une installation antérieure).

## La règle d'or

> **Ne remplacez JAMAIS tout le dossier.** De votre installation actuelle, deux éléments contiennent vos données :

| À **garder** (ne pas toucher) | Pourquoi |
|---|---|
| `data\` (dossier complet) | **toute l'archive** : lettres, employés, sociétés, modèles de papeterie, numéros de série + les sauvegardes `data\backups\` |
| `config.json` | votre **mot de passe**, le port, le chemin de la base |

| À **remplacer** (nouvelle version) | Rôle |
|---|---|
| `index.html` | l'application servie aux postes *(en mode partagé c'est ce fichier qui compte)* |
| `secretariat.html` | identique — utile seulement pour le mode « 1 PC par double-clic » |
| `server.py` | le serveur (contient les nouveautés côté numérotation / stockage) |

C'est tout. Les `.bat`, les guides et les PDF peuvent être remplacés aussi, sans risque.

---

## Procédure (5 étapes, 2 minutes)

### 1. Prévenir / choisir un moment calme
Personne ne doit être en train d'enregistrer une lettre.

### 2. Arrêter le serveur
Sur le PC serveur : fermer la fenêtre noire **ou** `Ctrl+C` dans cette fenêtre.
*(Les postes afficheront une erreur s'ils tentent d'enregistrer : c'est normal, ça repart après le redémarrage.)*

### 3. Sauvegarder par précaution (10 secondes)
Copier le dossier `data\` quelque part, par exemple :
`data_avant_maj_2026-10-20\`
→ ainsi, même en cas de fausse manœuvre, rien n'est perdu.

### 4. Remplacer les fichiers
Dézipper **`secretariat_maj.zip`** et copier son contenu **dans le dossier de l'application**, en **acceptant de remplacer** les fichiers existants :

```
C:\السكرتارية\
├── data\                 ← RESTE (vos données)
├── config.json           ← RESTE (mot de passe)
├── index.html            ← REMPLACÉ  ✔
├── secretariat.html      ← REMPLACÉ  ✔
└── server.py             ← REMPLACÉ  ✔
```

### 5. Relancer et vérifier
1. Double-clic sur `demarrer_serveur.bat`.
2. Sur un poste : ouvrir `http://ADRESSE:8080/` puis **F5** (forcer le rechargement).
3. Aller dans **⚙️ الإعدادات** → la carte « النسخ الاحتياطي » affiche la version, ex. **الإصدار 1.1.0**.
   Contrôle par l'adresse : `http://ADRESSE:8080/api/health` doit renvoyer `"version": "1.1.0"`.
4. Vérifier que l'archive est intacte : ouvrir **🗄️ الأرشيف** → vos lettres sont toujours là.

---

## Question fréquente : « et si je remplace tout par erreur ? »

Rien n'est perdu **si `data\` n'a pas été supprimé** :
- Si vous avez écrasé `index.html` / `server.py` : aucune conséquence sur l'archive.
- Si vous avez supprimé/écrasé `data\` : restaurez la copie de l'étape 3, ou la dernière sauvegarde de `data\backups\`, ou un export JSON (الإعدادات → استيراد نسخة احتياطية).
- Si `config.json` a été écrasé : le mot de passe revient à vide (le serveur recrée le fichier par défaut) — il suffit de le remettre.

> ⚠️ Une archive **ne vit pas** dans `index.html` ni dans `server.py` : elle est **uniquement** dans `data\`.

---

## Mode « 1 seul PC » (sans serveur)

Vous ouvrez `secretariat.html` par double-clic. Il suffit de le remplacer.
⚠️ Dans ce mode, l'archive est dans le **navigateur** : faites un export JSON avant, et un import après si nécessaire (le remplacement du fichier ne touche pas aux données, mais un changement de navigateur ou de dossier, si).

---

## Faut-il mettre à jour les autres postes ?

**Non.** Les postes n'ont pas de copie de l'application : ils chargent `index.html` depuis le serveur à chaque ouverture. Après la mise à jour, un simple **F5** suffit.

Si un poste a un raccourci, il continue de fonctionner (l'adresse ne change pas).

---

## Résumé express

| Question | Réponse |
|---|---|
| Je remplace tout le dossier ? | **Non** |
| Quels fichiers remplacer ? | `index.html`, `secretariat.html`, `server.py` ( + guides/PDF si vous voulez) |
| Quels fichiers garder ? | **`data\`** et **`config.json`** |
| Les postes doivent-ils quelque chose ? | Juste **F5** |
| Comment vérifier la version ? | ⚙️ الإعدادات → **الإصدار 1.1.0**, ou `/api/health` |
