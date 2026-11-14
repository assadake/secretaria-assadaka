# Pas à pas — mettre à jour sur UN SEUL PC

Version à installer : **1.1.0**

---

## ÉTAPE 1 — Sauvegarder (30 secondes, à ne pas sauter)

Ouvrir l'application → **⚙️ الإعدادات** → bouton **⬇ تصدير نسخة احتياطية (JSON)**

Un fichier `نسخة_احتياطية_2026-10-20.json` se télécharge.
→ Le déplacer dans un dossier sûr (Documents par exemple). **C'est votre filet de sécurité.**

☑️ *Quand c'est fait, passez à l'étape 2.*

---

## ÉTAPE 2 — Reconnaître votre mode d'ouverture

| Vous ouvrez l'application… | Mode | Allez à |
|---|---|---|
| en **double-cliquant sur `secretariat.html`** (le bandeau en haut est **gris « محلي »**) | Fichier | **Étape 3-A** |
| en tapant **http://localhost:8080** (bandeau **vert « أرشيف مشترك — متصل »**) | Serveur | **Étape 3-B** |

*Vous ne savez pas ? Regardez le bandeau en haut à gauche de l'écran : s'il est vert → 3-B, s'il est gris → 3-A.*

---

## ÉTAPE 3-A — Mode fichier (double-clic)

1. **Télécharger** le fichier **`secretariat.html`** (version 1.1.0) depuis l'espace de travail.
2. **Fermer** l'onglet de l'application dans le navigateur.
3. Dans le dossier où se trouve votre ancien `secretariat.html` (ex. `C:\السكرتارية\`) :
   - renommer l'ancien en `secretariat_ancien.html` *(sécurité)*,
   - **copier le nouveau** `secretariat.html` dans **ce même dossier**.
4. **Double-cliquer** sur le nouveau `secretariat.html`.
5. Vérifier : **⚙️ الإعدادات** → badge **الإصدار 1.1.0** en haut de la carte « النسخ الاحتياطي ».

> ⚠️ **Important** : le fichier doit rester dans **le même dossier** et porter **le même nom** qu'avant, sinon le navigateur ne retrouve pas vos données (elles sont liées à l'emplacement du fichier).
> Si vous ne voyez plus vos lettres → **الإعدادات → استيراد نسخة احتياطية** avec le fichier de l'étape 1.

---

## ÉTAPE 3-B — Mode serveur (localhost:8080)

1. **Télécharger** **`secretariat_maj.zip`** — ⚠️ **ne pas le dézipper**.
2. Dans l'application ouverte : **⚙️ الإعدادات** → descendre jusqu'à la carte **🔄 تحديث التطبيق**.
3. **Glisser le ZIP** dans la zone pointillée (ou bouton *اختيار ملف*).
4. Cliquer **⬆ تثبيت التحديث**.
5. Attendre le message vert listant les fichiers mis à jour.
6. Si le bouton **⟳ إعادة تشغيل الخادم** apparaît → **cliquer dessus**, attendre ~5 secondes (la page se recharge seule).
7. Vérifier : **الإعدادات** → **الإصدار 1.1.0** ; puis **🗄️ الأرشيف** → vos lettres sont toujours là.

> La fenêtre noire du serveur doit rester ouverte pendant l'opération.

---

## ÉTAPE 4 — Contrôle final (10 secondes)

Ouvrir **🗄️ الأرشيف** : vos lettres archivées sont-elles là ?
- **Oui** → mise à jour terminée ✅
- **Non** → **الإعدادات → استيراد نسخة احتياطية** et sélectionner le fichier de l'étape 1.

---

## En cas de blocage

| Ce que vous voyez | Que faire |
|---|---|
| Pas de carte « 🔄 تحديث التطبيق » | vous êtes en mode fichier → utilisez l'**étape 3-A** |
| « تعذّر التثبيت » | vérifier que le fichier n'a pas été dézippé, puis réessayer |
| Le bouton de redémarrage ne réagit pas | fermer la fenêtre noire, relancer `demarrer_serveur.bat`, puis F5 |
| Données disparues (mode fichier) | l'emplacement a changé → remettre le fichier au même endroit, ou importer le JSON |
| Badge toujours 1.0.x | votre version est antérieure : faire **une fois** l'étape 3-B *méthode manuelle* (remplacer `index.html` + `server.py` en gardant `data\`), ensuite le bouton fonctionnera |
