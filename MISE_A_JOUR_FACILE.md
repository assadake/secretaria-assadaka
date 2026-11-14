# Mettre à jour l'application — la méthode la plus simple

## ✅ Méthode 1 (la plus simple) : depuis l'application, en 3 clics

**Aucun fichier à copier, rien à arrêter à la main.**

1. Télécharger le fichier de mise à jour **`secretariat_maj.zip`** (fourni dans l'espace de travail).
   ⚠️ Ne **pas** le dézipper.
2. Ouvrir l'application sur n'importe quel poste → **⚙️ الإعدادات** → carte **🔄 تحديث التطبيق** (tout en bas).
3. **Glisser-déposer** le fichier ZIP dans la zone pointillée (ou « اختيار ملف ») → puis **⬆ تثبيت التحديث**.

C'est fait. L'application affiche la liste des fichiers mis à jour, puis :

- si seul `index.html` a changé → elle propose de **recharger la page** (accepter) ;
- si `server.py` a aussi changé (c'est le cas pour cette version) → un bouton **⟳ إعادة تشغيل الخادم** apparaît : cliquez dessus, le serveur se relance seul en ~3 secondes et la page se recharge automatiquement.

> 🔒 **Ce qui est garanti** : la mise à jour ne touche **que les fichiers du programme**.
> `data\` (l'archive : lettres, employés, sociétés, papeteries, compteurs) et `config.json` (mot de passe) **ne sont jamais modifiés**.
>
> 🛟 Une copie des anciens fichiers est conservée sur le serveur dans **`backups\app\`** (horodatée), donc un retour arrière reste possible.

### Vérifier après la mise à jour
- **⚙️ الإعدادات** → le badge affiche **الإصدار 1.1.0**.
- **🗄️ الأرشيف** → vos lettres sont toujours là.

### Les autres postes ?
Ils n'ont **rien à faire** : un **F5** suffit (ils rechargent l'application depuis le serveur).

---

## ⚠️ Une seule condition

La version **actuellement installée** doit déjà contenir ce bouton de mise à jour.
- Si votre installation est la version que je viens de livrer (1.1.0) : utilisez la méthode 1, toujours.
- Si vous avez installé une version **antérieure** : faites **une seule fois** la méthode 2 (ci-dessous, 2 minutes), et à partir de là vous n'aurez plus jamais à copier de fichiers.

---

## 🔧 Méthode 2 : la « mise à jour en un clic » (une seule fois)

Pour les installations antérieures. Objectif : remplacer **3 fichiers**, jamais plus.

1. **Arrêter** : fermer la fenêtre noire du serveur (ou `Ctrl+C`).
2. **Copier** le dossier `data\` → `data_avant_maj\` (sécurité, 10 secondes).
3. Dézipper `secretariat_maj.zip` **par-dessus** le dossier de l'application, en acceptant de remplacer.
   Il ne contient que : `index.html`, `secretariat.html`, `server.py` (+ les guides).
4. **Relancer** `demarrer_serveur.bat` → **F5** sur les postes.
5. Vérifier : **الإعدادات** → **الإصدار 1.1.0**.

Après cette étape, **toutes les mises à jour futures se feront par la méthode 1** (glisser-déposer dans l'application).

---

## 🔁 Et si je veux revenir en arrière ?

1. Arrêter le serveur.
2. Dans `backups\app\`, prendre les fichiers les plus récents **antérieurs** à la mise à jour (nommés `AAAAMMJJ-HHMMSS_index.html`, etc.).
3. Les recopier dans le dossier de l'application **en retirant le préfixe de date** (`20261020-131629_index.html` → `index.html`).
4. Relancer le serveur.

---

## Tableau comparatif

| | Méthode 1 — depuis l'app | Méthode 2 — copie de fichiers |
|---|---|---|
| Qui | tout utilisateur autorisé | la personne qui a accès au PC serveur |
| Actions | glisser-déposer + 1 ou 2 boutons | arrêter / copier / relancer |
| Risque de se tromper | **très faible** | faible (mais on peut écraser `data\`) |
| Effet sur les données | **aucun** | aucun **si** `data\` est conservé |
| À utiliser | **toujours**, dès que le bouton existe | une seule fois, pour une installation antérieure |
