# Mettre l'application sur GitHub (hébergement gratuit) + mises à jour automatiques

Pourquoi : plus de « localhost refused to connect », plus de fenêtre noire à laisser ouverte.
L'application est servie par GitHub, accessible par un simple lien, et **elle vous prévient elle-même** quand une nouvelle version est publiée.

> ⚠️ Je ne peux pas pousser sur GitHub depuis cette conversation (pas de connexion GitHub ici).
> En revanche j'ai préparé **tout le dépôt prêt à téléverser** : `app-github.zip`. Vous n'avez qu'à le déposer.

---

## 1. Créer le dépôt (2 minutes)

1. Aller sur <https://github.com> → se connecter (créer un compte si besoin).
2. Bouton **＋** (en haut à droite) → **New repository**.
3. Nom : `secretariat` (ou `السكرتارية` — les accents arabes fonctionnent, mais un nom latin donne une URL plus simple).
4. **Public** ✔ (obligatoire pour GitHub Pages gratuit) · ne rien cocher d'autre → **Create repository**.

## 2. Téléverser les fichiers

1. Sur la page du dépôt vide → lien **« uploading an existing file »**
   *(ou : Add file → Upload files)*.
2. Dézipper `app-github.zip` et **glisser les 5 fichiers** dans la page :
   ```
   index.html          ← l'application
   secretariat.html    ← identique (copie de secours)
   version.json        ← numéro de version publié
   .nojekyll           ← obligatoire pour GitHub Pages
   README.md           ← description (facultatif)
   ```
3. En bas → **Commit changes**.

## 3. Activer GitHub Pages (1 minute)

1. Dans le dépôt : **Settings** (onglet en haut) → menu de gauche **Pages**.
2. *Source* : **Deploy from a branch**.
3. *Branch* : **main** → dossier **/ (root)** → **Save**.
4. Attendre 1 à 2 minutes, puis recharger la page : le lien apparaît en haut :
   ```
   https://VOTRE-COMPTE.github.io/secretariat/
   ```

✅ C'est votre adresse définitive. Mettez-la en favori / raccourci Bureau.
Elle fonctionne depuis n'importe quel PC, sans Python, sans serveur.

---

## 4. Comment fonctionnent les mises à jour

L'application lit `version.json` à l'ouverture, puis **toutes les 10 minutes**.
Si la version publiée est plus récente que celle chargée, une pastille apparaît en haut à gauche :

> **⟳ تحديث متوفر 1.3.0** → un clic recharge la nouvelle version.

**Pour publier une nouvelle version (côté vous) :**
1. Dans le dépôt : **Add file → Upload files** → déposer le nouveau `index.html` → *Commit changes*.
2. Ouvrir `version.json` → crayon ✏️ → changer `"version": "1.2.0"` en `"1.3.0"` → *Commit changes*.
3. Les postes voient la pastille dans les 10 minutes (ou immédiatement avec F5).

**Pour une nouvelle version (côté moi) :** demandez-moi simplement « nouvelle version » dans la conversation — je vous fournis un `index.html` + `version.json` à déposer de la même façon.

---

## 5. Ce que cela change pour vos données

| Sujet | GitHub Pages (cette méthode) | Serveur local (méthode précédente) |
|---|---|---|
| Installation | aucune | Python + fenêtre noire |
| Adresse | lien fixe `https://…github.io/…` | `http://192.168.x.x:8080` (change si l'IP change) |
| **Archive partagée entre postes** | ❌ **non** — les données restent dans le navigateur de chaque PC | ✅ oui |
| Mise à jour | **automatique** (pastille) | manuelle (ZIP) |
| Données | par navigateur / par PC | une seule base commune |

⚠️ **Point important** : GitHub Pages = site statique, il **ne peut pas stocker** l'archive commune.
Concrètement :
- **Sauvegarde obligatoire** : ⚙️ الإعدادات → تصدير نسخة احتياطية (JSON), régulièrement.
- Passer d'un PC à l'autre = exporter puis importer le JSON.
- Si vous voulez **l'archive commune ET les mises à jour automatiques**, la solution est : GitHub Pages pour l'interface + un petit serveur de données (Supabase / Firebase / Cloudflare) — dites-le-moi et je le branche.

### Bonne combinaison possible
- **GitHub Pages** = façon la plus simple d'**ouvrir** l'application partout (plus de localhost).
- En parallèle, chacun fait ses exports JSON (ou vous gardez le serveur local pour le partage).

---

## 6. Sécurité / confidentialité

- Un dépôt **public** est visible par tout le monde : on y trouve l'application et **l'en-tête des sociétés**. **Aucune** lettre, aucun employé, aucune donnée client n'y est publié (l'archive reste dans le navigateur).
- Si l'en-tête doit rester privé : GitHub **Private** + hébergement privé (Cloudflare Pages / Netlify avec mot de passe), ou garder le serveur local. Je peux préparer la variante.

---

## 7. Dépannage

| Symptôme | Cause / solution |
|---|---|
| Page 404 après activation | attendre 2 min ; vérifier *Settings → Pages* : branch **main**, dossier **/ (root)** ; le fichier doit s'appeler exactement `index.html` |
| Le site s'affiche sans mise en forme | le fichier `.nojekyll` manque → le rajouter (Add file → Create new file → nom `.nojekyll` → contenu vide → Commit) |
| La pastille de mise à jour n'apparaît pas | `version.json` non mis à jour, ou version identique ; forcer avec F5 ; vérifier l'URL `https://…/version.json` |
| Les données ont disparu | nouveau PC / autre navigateur / URL différente → importer le JSON |
| Je veux désactiver l'hébergement | Settings → Pages → *Source* : **None** |
