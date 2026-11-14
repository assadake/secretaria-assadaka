# Ouvrir l'application sur votre PC (hors ligne)

L'application tient dans **un seul fichier** : `secretariat.html` (≈ 745 Ko).
Il contient déjà la charte des deux sociétés, la police arabe et toute la logique : **aucune installation, aucun internet requis**.

---

## 1. Récupérer le fichier

1. Dans l'espace de travail, ouvrez `secretariat/secretariat.html` puis cliquez sur **Télécharger** (ou téléchargez `secretariat_pc.zip` qui contient tout).
2. Placez-le dans un dossier **fixe**, par exemple :
   - `C:\السكرتارية\secretariat.html`  (recommandé : evitez Bureau/Téléchargements, qui se vident)
3. Ne le renommez pas et évitez de le déplacer : le navigateur associe les données à son emplacement.

## 2. Ouvrir

**Méthode A — le plus simple**
Double-cliquez sur `secretariat.html` → il s'ouvre dans votre navigateur par défaut (Edge, Chrome…). C'est tout.

**Méthode B — le raccourci fourni**
Double-cliquez sur `lancer_application.bat` :
- si Python est installé, il démarre un petit serveur local sur `http://localhost:8080` (avantage : adresse stable, et possibilité d'ouvrir l'app depuis un autre PC du bureau) ;
- sinon, il ouvre le fichier directement.

**Méthode C — toujours la même adresse (Windows, sans Python)**
1. Clic droit sur `secretariat.html` → **Envoyer vers** → **Bureau (créer un raccourci)**.
2. Renommez le raccourci « السكرتارية ». Double-clic : l'app s'ouvre toujours au même endroit.

> Navigateur conseillé : **Edge** ou **Chrome** (même moteur, mise en page A4 et export PDF les plus fiables).
> ⚠️ N'utilisez pas la navigation privée : les données seraient perdues à la fermeture.

## 3. Enregistrer les documents en PDF

Bouton **🖨️ طباعة / PDF** → dans la fenêtre d'impression :

| Réglage | Valeur |
|---|---|
| Destination | **Enregistrer au format PDF** |
| Format papier | **A4** |
| Marges | **Aucune / None** |
| Échelle | **100 %** (pas « ajuster à la page ») |
| **Graphiques d'arrière-plan** | ✅ **à cocher** (sinon l'en-tête coloré et le logo ne sortent pas) |
| En-tête/pied de page du navigateur | ❌ décocher |

Le PDF obtenu fait exactement **une page A4**, prêt à imprimer ou à envoyer.

## 4. Sauvegarder vos données (important)

Les lettres archivées, les employés et les paramètres sont stockés **dans le navigateur de ce PC** (localStorage), pas dans le fichier HTML.

- Menu **الإعدادات** → **تصدير نسخة احتياطية (JSON)** : à faire **chaque semaine** (ou après une grosse saisie).
- Conservez ces fichiers `.json` sur le réseau ou une clé USB.
- Pour changer de PC / réinstaller Windows : même écran → **استيراد نسخة احتياطية**.

> ⚠️ Ne mélangez pas les « origines » : les données enregistrées en ouvrant `secretariat.html` par double-clic ne sont **pas** visibles si vous ouvrez ensuite l'app via `http://localhost:8080` (ou inversement). Choisissez **une** méthode d'ouverture et gardez-la.
> De même, chaque navigateur (Edge vs Chrome) a son propre stockage.

## 5. Partager avec les collègues

> ✅ **Une archive commune est maintenant disponible** : voir le guide `ARCHIVE_PARTAGEE.md`
> (un PC « serveur » exécute `demarrer_serveur.bat`, les autres postes ouvrent `http://ADRESSE-DU-PC:8080/`).
> Les deux modes restent possibles : chacun sa copie (ci-dessous) ou une archive partagée.

- **Copie du fichier** : envoyez `secretariat.html` par e-mail/clé USB — chacun a son archive locale séparée.
- **Archive commune** : lancez la méthode B sur un PC du bureau, puis ouvrez depuis les autres postes `http://NOM-DU-PC:8080/`. ⚠️ Dans ce cas, la base reste sur le PC serveur, et **il ne faut pas travailler à deux en même temps** (pas de synchronisation). Pour un vrai multi-utilisateurs, il faudra une version avec base de données — dites-le-moi et je la prépare.

## 6. Dépannage express

| Problème | Cause / solution |
|---|---|
| Page blanche | Fichier incomplet (téléchargement interrompu) → retélécharger, taille attendue ≈ 745 Ko |
| L'en-tête coloré manque sur le PDF | Cocher **Graphiques d'arrière-plan** dans les options d'impression |
| « وضع المعاينة: لن تُحفظ البيانات » | Vous êtes en navigation privée ou stockage bloqué → ouvrez en fenêtre normale |
| Données disparues après avoir déplacé le fichier | Restaurez la dernière sauvegarde **JSON** (الإعدادات → استيراد) |
| Le texte chevauche le pied de page | Marges = **Aucune**, échelle = **100 %** |

---

### Contenu du paquet `secretariat_pc.zip`
```
secretariat.html                    ← l'application (fichier unique)
index.html                          ← identique (pour un serveur local)
lancer_application.bat              ← lanceur Windows (double-clic)
README_دليل_الاستخدام.md             ← guide complet en arabe
OUVRIR_SUR_PC.md                    ← ce guide
exemples_lettres.pdf                ← 11 pages de contrôle des modèles
```
