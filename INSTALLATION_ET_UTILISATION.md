# Installation et utilisation — guide pas à pas

> Pour une archive hébergée partagée sur Supabase, avec serveur Render, consultez [`SUPABASE_DEPLOIEMENT.md`](SUPABASE_DEPLOIEMENT.md). Le guide ci-dessous décrit principalement l'installation locale SQLite.

Ce guide couvre les **deux installations possibles**. Choisissez selon votre besoin :

| | **A. Un seul PC** | **B. Plusieurs PC, archive commune** ← votre choix |
|---|---|---|
| Qui l'utilise | Une personne | Les secrétaires + la direction |
| Archive | Locale au navigateur de ce PC | Une seule base, sur le PC « serveur » |
| Installation | Aucune | Python sur **un** PC (le serveur) |
| Accès | Double-clic sur un fichier | Adresse `http://…:8080/` depuis chaque poste |
| Risque de doublons / de copies | Copies séparées | Aucun doublon, tout le monde voit la même archive |

> **Conseil** : installez d'abord **B** (le serveur). Sur le PC serveur, l'application reste utilisable même sans les autres postes.

---

# PARTIE 1 — INSTALLATION

## Étape 0 — Récupérer les fichiers

1. Téléchargez **`secretariat_pc.zip`** depuis l'espace de travail.
2. Clic droit → **Extraire tout…** vers un dossier **fixe** :
   `C:\السكرتارية\`
   *(évitez Bureau / Téléchargements / clé USB : ces dossiers changent ou se vident)*

Après extraction vous avez :
```
C:\السكرتارية\
├── server.py                 ← serveur d'archive partagée
├── demarrer_serveur.bat      ← double-clic pour démarrer le serveur
├── config.json               ← port, mot de passe
├── index.html                ← l'application
├── secretariat.html          ← identique (mode 1 PC)
├── lancer_application.bat    ← mode 1 PC
├── ARCHIVE_PARTAGEE.md       ← guide réseau détaillé
├── OUVRIR_SUR_PC.md          ← guide poste local
├── README_دليل_الاستخدام.md   ← guide en arabe
└── exemples_lettres.pdf      ← 11 modèles imprimés pour contrôle
```

---

## Option A — Un seul PC (le plus rapide, 30 secondes)

1. Double-cliquez sur **`secretariat.html`** → l'application s'ouvre dans Edge/Chrome.
2. C'est tout. Pour un raccourci permanent : clic droit sur le fichier → *Envoyer vers* → *Bureau (créer un raccourci)*, renommez-le « السكرتارية ».

⚠️ Dans ce mode, l'archive est stockée **dans le navigateur de ce PC**. Faites des exports JSON réguliers (voir Partie 4).

---

## Option B — Archive commune (recommandé)

### B.1 — Sur le PC « serveur » (un seul PC)

**a) Installer Python (une seule fois)**
1. Aller sur <https://www.python.org/downloads/> → bouton jaune **Download Python**.
2. Lancer l'installeur. **IMPORTANT : cocher la case en bas « Add python.exe to PATH »**, puis *Install Now*.
3. Vérifier : touche Windows → taper `cmd` → Entrée → taper :
   ```
   python --version
   ```
   → doit afficher `Python 3.12.x` (ou plus récent).

**b) Démarrer le serveur**
1. Double-clic sur **`demarrer_serveur.bat`**.
2. Une fenêtre noire s'ouvre et affiche :
   ```
   على هذا الجهاز  : http://localhost:8080/
   من أجهزة أخرى  : http://192.168.1.20:8080/     ← NOTEZ CETTE ADRESSE
   ```
   *(192.168.1.20 n'est qu'un exemple : la vraie adresse s'affiche chez vous)*
3. Si Windows demande « Autoriser Python dans le pare-feu » → **Autoriser** (réseaux privés). Sans cela les autres postes ne pourront pas se connecter.
4. **Laisser la fenêtre ouverte.** La fermer = serveur arrêté.

**c) Vérifier sur place**
Ouvrir `http://localhost:8080/` → l'application doit s'afficher avec, en haut, un bandeau vert **« ● أرشيف مشترك — متصل »**.

### B.2 — Sur chaque autre poste (secrétaires, direction)

Rien à installer :
1. Ouvrir **Edge** ou **Chrome**.
2. Taper l'adresse notée : `http://192.168.1.20:8080/`
3. Le bandeau vert « أرشيف مشترك — متصل » confirme la connexion à l'archive commune.
4. Créer un raccourci : dans la page, menu ⋯ → *Plus d'outils* → **Créer un raccourci** → nom « السكرتارية ». Il apparaît sur le Bureau / dans la barre des tâches.

**Test final** : archivez une lettre depuis le poste 1 → elle apparaît sur le poste 2 (au plus tard après ~7 s, ou immédiatement en cliquant sur le bandeau).

### B.3 — Protéger par mot de passe (fortement conseillé)

1. Sur le PC serveur, ouvrir `config.json` avec le **Bloc-notes**.
2. Remplacer la ligne du mot de passe :
   ```json
   "password": "ChangezMoi2026!",
   ```
   *(garder les guillemets et la virgule)*
3. Enregistrer, fermer la fenêtre noire du serveur, puis relancer `demarrer_serveur.bat`.
4. Chaque poste verra l'écran **« 🔒 دخول الأرشيف المشترك »** et saisira le mot de passe une fois (valable 12 h).

### B.4 — Deux réglages recommandés au bureau

| Réglage | Pourquoi | Comment |
|---|---|---|
| **IP fixe** pour le PC serveur | sinon l'adresse change au redémarrage et les raccourcis cassent | dans le routeur : réservation DHCP pour l'adresse MAC du PC serveur (ou demander à l'informaticien) |
| **Démarrage automatique** du serveur | le serveur doit tourner chaque matin | copier un raccourci de `demarrer_serveur.bat` dans `shell:startup` (touche Windows + R → taper `shell:startup`) |

---

# PARTIE 2 — UTILISATION QUOTIDIENNE

## 2.1 Créer et archiver une lettre (le geste de base)

1. Menu de droite (ou bouton bleu en haut) → **📝 خطاب جديد**.
2. **Choisir le modèle** dans la grille (9 modèles, 3 familles) :
   - الشهادات : شهادة عمل · راتب · أقدمية · نهاية الخدمة
   - RH : أمر مهمة · قرار منح إجازة · مذكرة داخلية
   - Externe : خطاب مراسلة رسمي · خطاب حر
3. **Vérifier la société active** (liste en haut de l'écran) :
   `الصداقة المثالية — AIS` (aliments) ou `الصداقة المثالية — مواد البناء — AIS-BM`.
4. **Remplir les champs.** Astuce : choisir d'abord l'employé dans « اختيار الموظف » → nom, fonction, service, matricule et date d'embauche se remplissent seuls.
5. L'**aperçu A4** se met à jour à chaque frappe. Les calculs sont automatiques : ancienneté (شهادة أقدمية), montant en lettres (شهادة راتب), liste à puces (أمر مهمة, سطر = puce).
6. Cliquer **💾 أرشفة الخطاب** → un numéro de référence est attribué et la lettre part dans l'archive.
   *(`حفظ كمسودة` = brouillon, modifiable plus tard)*

**Numérotation** : `AIS-BM/COR/2026/0017` = société / type de document / année / numéro. Compteur propre à chaque société et chaque type, remis à zéro au 1ᵉʳ janvier.

## 2.2 Imprimer / enregistrer en PDF

Bouton **🖨️ طباعة / PDF** (dans le formulaire ou depuis l'archive). Dans la fenêtre d'impression :

| Réglage | Valeur |
|---|---|
| Destination | **Enregistrer au format PDF** |
| Format papier | **A4** |
| Marges | **Aucune / None** |
| Échelle | **100 %** |
| **Graphiques d'arrière-plan** | ✅ **coché** (sinon l'en-tête coloré et le logo ne sortent pas) |
| En-tête et pied de page du navigateur | ❌ décochés |

→ Le PDF obtenu = **exactement une page A4**, prêt à imprimer ou à envoyer.

## 2.3 Retrouver une lettre (الأرشيف)

- **Recherche** par numéro, nom ou objet ; **filtres** : modèle, société, période (du / au).
- Boutons sur chaque ligne : 👁 aperçu · ✏️ modifier · 🖨 réimprimer · 🗑 supprimer.
- **⬇ تصدير السجل CSV** → s'ouvre dans Excel : pratique pour un rapport mensuel des courriers.

## 2.4 Gérer les employés (الموظفون)

**+ إضافة موظف** → nom, fonction, service, numéro national, date d'embauche, société.
Ensuite, dans n'importe quel modèle, le sélecteur « اختيار الموظف » remplit tout automatiquement.
« استيراد من Excel/CSV » n'existe pas encore : la saisie se fait dans cet écran (je peux l'ajouter).

## 2.5 Gérer les sociétés et la papeterie (الشركات)

Chaque société peut avoir **plusieurs modèles de papeterie** (par ex. une trame normale + une trame dédiée à certains courriers). Le modèle **actif** est celui utilisé pour les nouvelles lettres.

Boutons disponibles sur chaque modèle :

| Bouton | Action |
|---|---|
| **تعيين كنشط** | utiliser ce modèle pour les prochaines lettres |
| **✏️ تعديل** | ouvrir l'éditeur (voir ci-dessous) |
| **⧉ نسخة** | dupliquer le modèle → crée le **2ᵉ modèle** de la même société, à personnaliser |
| **🗑** | supprimer le modèle (impossible s'il n'en reste qu'un) |
| **＋ إضافة نموذج ترويسة** | créer un modèle de zéro |

**Dans l'éditeur :**
- **Nom du modèle** (ex. « ترويسة الخطابات الإدارية »).
- **Mode de composition** :
  - *ترويسة أعلى + تذييل أسفل* : vous fournissez séparément l'en-tête, le pied de page et le filigrane.
  - *نموذج كامل — صورة A4 كاملة* : vous fournissez **une seule image de page A4 entière** (en-tête + pied déjà intégrés) ; le texte se pose dessus, avec deux réglages de marge (haut / bas en mm). Très pratique si votre papeterie existe déjà en image ou en PDF.
- **Chaque emplacement** (en-tête / pied / filigrane) propose :
  - **رفع صورة** – charger votre image (PNG/JPG) ; elle est redimensionnée automatiquement (≈ 2000 px de large),
  - **🗑 حذف** – **supprimer l'image et revenir à la trame par défaut** (c'est la correction du problème rencontré),
  - **↺ افتراضي** – retour à l'image par défaut,
  - l'étiquette indique **مخصص** (personnalisé) ou **افتراضي** (par défaut).
- **👁 معاينة على خطاب** : imprimer/visualiser un aperçu avec ce modèle avant de valider.
- **💾 حفظ النموذج** : enregistre (et en mode partagé, publie pour tous les postes).

⚠️ Si vous avez inséré une image par erreur : ouvrez le modèle → **🗑 حذف** sur l'emplacement concerné → **💾 حفظ** (ou **إلغاء** pour tout abandonner sans rien changer).

Le reste de la fiche société (coordonnées, signataire, libellé du numéro « الرقم » / « الرقم الاشاري ») se règle via **✏️ تعديل بيانات الشركة**, et **+ إضافة شركة** ajoute une nouvelle entité.

## 2.6 Structure du numéro référentiel (تركيب الرقم المرجعي)

Dans **⚙️ الإعدادات** → carte **🔢 تركيب الرقم المرجعي**, vous définissez le format du numéro attribué automatiquement :

| Variable | Signification | Exemple |
|---|---|---|
| `{c}` | code société | `AIS` |
| `{t}` | code du type de document | `SHA`, `COR`, `MEM`… |
| `{y}` / `{yy}` | année sur 4 / 2 chiffres | `2026` / `26` |
| `{mm}` | mois sur 2 chiffres | `10` |
| `{n}` | numéro de série brut | `17` |
| `{n:03d}` / `{n:04d}` | série sur 3 / 4 chiffres | `017` / `0017` |

- Saisissez la formule (cliquez sur les pastilles pour les insérer), ou choisissez une **صيغة جاهزة**.
- **معاينة** affiche le résultat en direct.
- **💾 حفظ الصيغة** applique pour toutes les nouvelles lettres ; **↺ الافتراضي** revient à `{c}/{t}/{y}/{n:04d}`.

Exemples :
```
{c}/{t}/{y}/{n:04d}      → AIS/SHA/2026/0001     (défaut)
{c}-{t}-{y}-{n:03d}      → AIS-SHA-2026-001
{c}/{y}/{n:04d}          → AIS/2026/0001
{c}/{t}/{mm}-{y}/{n:03d} → AIS/SHA/10-2026/001   (série mensuelle)
```
Le compteur reste **indépendant par société / type / année** et repart à 1 au 1ᵉʳ janvier. Le format est mémorisé côté serveur (donc identique sur tous les postes).

## 2.7 Régler les préférences (الإعدادات)

- Ville affichée avant la date (par défaut « طرابلس، في … »).
- Format de date : long arabe (20 أكتوبر 2026م) ou numérique (20/10/2026).
- Afficher / masquer le cadre du cachet et le filigrane.

---

# PARTIE 3 — COMBIEN DE TEMPS, QUI FAIT QUOI

| Tâche | Qui | Quand |
|---|---|---|
| Démarrer le PC serveur + `demarrer_serveur.bat` | secrétariat (1ʳᵉ personne arrivée) | chaque matin |
| Créer / archiver / imprimer les lettres | secrétaires | au fil de l'eau |
| Exporter la sauvegarde JSON | secrétariat | **1 fois par semaine** |
| Copier `data\` sur clé USB / serveur | informaticien | 1 fois par semaine |
| Mettre à jour l'application | informaticien | à chaque nouvelle version |

---

# PARTIE 4 — SAUVEGARDES (le point à ne pas négliger)

**En mode partagé, tout est dans un seul dossier** : `C:\السكرتارية\data\`

1. **Automatique** : à chaque démarrage du serveur, la base est copiée dans `data\backups\` (les 30 dernières sont gardées).
2. **Depuis l'application** : *الإعدادات* → **تصدير نسخة احتياطية (JSON)** → fichier à conserver (généré par le serveur, donc complet).
3. **Restauration** : *الإعدادات* → **استيراد نسخة احتياطية** → en mode partagé, cela **remplace** l'archive commune (confirmation demandée).
4. **Bonne pratique** : copier le dossier `data\` chaque semaine sur une clé USB ou le disque réseau de l'entreprise.

---

# PARTIE 5 — DÉPANNAGE RAPIDE

| Symptôme | Cause | Solution |
|---|---|---|
| « python n'est pas reconnu » | Python pas installé, ou case « Add to PATH » oubliée | réinstaller Python en cochant la case, puis rouvrir la fenêtre |
| Autres postes : « site inaccessible » | pare-feu, ou mauvaise adresse, ou réseau différent | autoriser Python dans le pare-feu (réseau privé) ; vérifier l'adresse affichée ; même Wi-Fi/câble ; tester `ping ADRESSE` |
| « Impossible d'ouvrir le port 8080 » | un autre programme/ancienne fenêtre occupe le port | fermer l'ancienne fenêtre, ou changer `"port": 8090` dans `config.json` |
| Bandeau **gris** « محلي » sur un poste | page ouverte par double-clic (`file://`) au lieu du serveur | ouvrir `http://ADRESSE:8080/` |
| « انتهت الجلسة » | session de 12 h expirée | ressaisir le mot de passe |
| En-tête coloré absent du PDF | option d'impression | cocher **Graphiques d'arrière-plan**, marges = Aucune |
| Deux lettres avec le même numéro | ne peut pas arriver en mode serveur (numéro attribué par le serveur) | en mode local uniquement : vérifier la sauvegarde |
| L'adresse IP a changé | pas d'IP fixe | réserver l'IP dans le routeur, ou redonner la nouvelle adresse aux postes |

---

# PARTIE 6 — METTRE À JOUR L'APPLICATION

> 💡 **Le plus simple : la mise à jour se fait depuis l'application** (⚙️ الإعدادات → 🔄 تحديث التطبيق → glisser `secretariat_maj.zip`).
> Voir **`MISE_A_JOUR_FACILE.md`**. La procédure manuelle ci-dessous ne sert qu'une fois, pour une version antérieure
> (guide complet : `MISE_A_JOUR.md`).

Résumé : **on ne remplace pas tout.**

1. Fermer la fenêtre du serveur (ou `Ctrl+C`).
2. Copier `data\` par précaution (`data_avant_maj_...`).
3. Dézipper `secretariat_maj.zip` **par-dessus** le dossier de l'application : il contient
   `index.html`, `secretariat.html`, `server.py` (+ les guides) — et **rien d'autre**.
4. **Conserver** `data\` (l'archive) et `config.json` (mot de passe).
5. Relancer `demarrer_serveur.bat`, puis **F5** sur les postes.
6. Vérifier la version : ⚙️ الإعدادات → « الإصدار 1.1.0 ».

---

## Aide-mémoire à imprimer
Un résumé d'une page en arabe pour le bureau est fourni : **`دليل_سريع_للسكرتارية.pdf`**
(à imprimer et poser près du poste : création de lettre, impression PDF, recherche, sauvegarde).

Besoin d'autre chose ? Les évolutions possibles : rôles utilisateurs (سكرتير / مدير / اطلاع فقط), import Excel des employés, registre d'envoi (à qui / par quel moyen / date), numérisation des lettres signées jointes.
