# Mon école BTS

Backend Node.js/Express pour la plateforme : dépôt de modules avec audio,
questions-réponses texte/audio, sujets d'examen chronométrés, deux
programmes (standard + session intensive mai-août), paiement mobile.

Filières couvertes : PMO, GRH, CGE, TL, CE.

Pour le moment, seul **Airtel Money** (via CinetPay) est activé comme moyen
de paiement. MyNITA et AmanaTa sont préparés dans le code (numéro de compte
déjà renseigné) mais désactivés en attendant l'ouverture des comptes
marchands — voir `src/utils/operateurs/`.

## Installation

Nécessite un serveur **MySQL 8+** ou **MariaDB 10.5+**.

```bash
npm install
cp .env.example .env
# remplir .env : DATABASE_URL (format mysql://user:motdepasse@hote:3306/nom_base),
# JWT_SECRET, et les identifiants marchands CinetPay / MyNITA / AmanaTa quand tu les auras

# créer les tables puis les filières/programmes de départ
mysql -u <utilisateur> -p <nom_base> < sql/schema.sql
mysql -u <utilisateur> -p <nom_base> < sql/donnees_initiales.sql

npm run dev
```

## Structure

```
server.js                          point d'entrée
sql/schema.sql                     tables (utilisateurs, modules, sujets, copies, notifications, codes_otp...)
sql/donnees_initiales.sql          les 5 filières BTS
sql/compte_gestionnaire.sql        crée le compte admin avec mot de passe déjà défini
src/config/db.js                   connexion MySQL/MariaDB
src/config/upload.js               configuration Multer (vidéos de synthèse)
src/middleware/auth.js             JWT + verrou "un seul appareil actif"
src/controllers/                   logique métier par domaine
src/routes/                        endpoints HTTP
src/utils/sms.js                   envoi SMS (préparé, mode console par défaut)
src/jobs/cloturerCopiesExpirees.js tâche planifiée : note 0 si copie non soumise à temps
src/jobs/rappelAbonnements.js      tâche planifiée : rappel avant expiration d'abonnement
scripts/creerAdmin.js              création du compte gestionnaire
scripts/reinitialiserMotDePasse.js réinitialisation d'un mot de passe
scripts/sauvegarderBase.sh         sauvegarde de la base de données
```

## Espace gestionnaire (admin)

Un rôle `admin` permet de suivre la progression des étudiants, les absences
aux examens (copies non soumises à temps) et l'activité des enseignants
(sujets publiés). Page : `frontend/gestion.html`, API : `/api/admin/*`.

Ce rôle n'a volontairement **pas** de formulaire d'inscription public. Deux
façons de créer ton compte gestionnaire :

**Option A - déjà prêt** : `sql/compte_gestionnaire.sql` crée directement le
compte avec le mot de passe déjà défini (hash bcrypt intégré, jamais le mot
de passe en clair). À exécuter une seule fois, après `schema.sql` et
`donnees_initiales.sql` :
```bash
mysql -u <utilisateur> -p -h <hote> -P <port> <nom_base> < sql/compte_gestionnaire.sql
```
⚠️ Ce fichier contient un hash de mot de passe : garde ton dépôt GitHub en
**privé**, et envisage de supprimer ce fichier une fois exécuté.

**Option B - choisir un autre mot de passe** :
```bash
node scripts/creerAdmin.js "97843611" "Nouhou Garba Ali" "ton-mot-de-passe"
```

Connecte-toi ensuite normalement depuis `index.html` avec ce numéro et ce
mot de passe — tu seras redirigé automatiquement vers l'espace gestionnaire.

Mot de passe oublié (gestionnaire ou tout autre compte) ? Réinitialise-le
directement en base :
```bash
node scripts/reinitialiserMotDePasse.js "97843611" "nouveau-mot-de-passe"
```

## Frontend

Un frontend statique (HTML/CSS/JS, sans build) se trouve dans `frontend/` et
est servi directement par le serveur Express (`server.js`) — un seul service
à héberger, pas besoin d'une plateforme séparée pour le frontend. Fond beige
clair et texte sombre adaptés à la lecture prolongée, accent sarcelle. Pages :
connexion, inscription (3 étapes), abonnement, tableau de bord étudiant,
module (audio + questions), examen chronométré, espace enseignant, espace
gestionnaire.

Pour le tester en local, `npm run dev` puis ouvrir `http://localhost:3000`
dans un navigateur (le frontend et l'API sont sur le même port).

**Limite résolue** : les comptes enseignants (vacataires) ont désormais leur
propre inscription (`enseignant-inscription.html` / `/api/auth/inscription-enseignant`)
— gratuite, sans étape de paiement, avec la même règle un numéro = un compte
non transférable que pour les étudiants.

## Mise en ligne (déploiement)

Étapes pour rendre la plateforme accessible sur internet, avec **Railway**
(gratuit pour démarrer, et propose une base MySQL en un clic - contrairement
à Render, qui gère très bien le backend Node.js mais demande une
configuration Docker plus avancée pour une base MySQL) :

**1. Mettre le code sur GitHub**
- Crée un compte sur [github.com](https://github.com) si tu n'en as pas
- Crée un nouveau dépôt (repository), par exemple `mon-ecole-bts`
- Envoie ce dossier de projet dedans (via l'interface web de GitHub - "upload files" - si tu ne connais pas encore Git en ligne de commande)

**2. Créer la base de données MySQL sur Railway**
- Crée un compte sur [railway.com](https://railway.com)
- Dans un nouveau projet, "New" → "Database" → "Add MySQL"
- Une fois créée, ouvre l'onglet "Variables" du service MySQL et copie la valeur de `MYSQL_URL` (ou construis-la toi-même à partir de `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLPORT`, `MYSQLDATABASE` au format `mysql://user:motdepasse@hote:port/base`)

**3. Créer le service web (le backend + frontend ensemble)**
- Dans le même projet Railway, "New" → "GitHub Repo", connecte le dépôt créé à l'étape 1
- Railway détecte automatiquement Node.js (`npm install` puis `npm start` via `package.json`)
- Dans l'onglet "Variables" du service web, ajoute celles de `.env.example` :
  `DATABASE_URL` (colle l'URL MySQL de l'étape 2), `JWT_SECRET`
  (choisis une phrase secrète longue), `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`,
  et les numéros MyNITA/AmanaTa déjà connus
- Lance le déploiement

**4. Initialiser les tables et les filières/programmes**
Une fois la base en ligne, connecte-toi avec l'URL MySQL de l'étape 2 et exécute :
```bash
mysql -u <utilisateur> -p -h <hote> -P <port> <nom_base> < sql/schema.sql
mysql -u <utilisateur> -p -h <hote> -P <port> <nom_base> < sql/donnees_initiales.sql
```

**5. Créer ton compte gestionnaire**
Le plus simple : exécute `sql/compte_gestionnaire.sql` juste après l'étape 4
(mot de passe déjà défini). Pour en choisir un autre, utilise plutôt :
```bash
node scripts/creerAdmin.js "97843611" "Nouhou Garba Ali" "ton-mot-de-passe"
```

**6. Nom de domaine (optionnel au démarrage)**
Railway te donne une adresse gratuite du type `mon-ecole-bts.up.railway.app`,
utilisable telle quelle. Un nom personnalisé (`monecolebts.com`) peut être
acheté séparément puis relié au service dans les réglages Railway.

**7. Stockage des fichiers audio/PDF**
Les champs `audio_url`, `support_url`, `fichier_url` attendent des liens
publics vers les fichiers. Pour l'instant, une solution simple pour démarrer
sans service de stockage payant : héberger les fichiers sur Google Drive
(lien de partage public) et coller ce lien dans l'espace enseignant. Un vrai
service de stockage (S3, Backblaze) pourra remplacer ça plus tard sans
changer le reste du code.

## Vidéo de synthèse des modules (enseignants vacataires)

Dans son espace, un enseignant peut envoyer une courte vidéo de synthèse
pour un module existant : **0 à 30 minutes, 0 à 50 Mo**.

- La **taille** (50 Mo) est vérifiée par le serveur (Multer) - un fichier
  plus lourd est rejeté avant même d'être écrit sur le disque.
- La **durée** (30 minutes) est mesurée directement par le navigateur de
  l'enseignant à partir du fichier vidéo choisi (aucun envoi tant qu'elle
  n'est pas validée), puis revérifiée par le serveur à réception. Sans un
  outil comme `ffmpeg` installé sur le serveur, la durée du fichier
  lui-même n'est pas re-mesurée côté serveur - une amélioration possible
  plus tard si une garantie plus stricte est nécessaire.

Les vidéos sont stockées dans `uploads/videos/` (ou le dossier pointé par
`UPLOADS_DIR`) et servies via `/uploads/...`.

### Stockage persistant des vidéos (volume Railway)

Sur un service web classique, le disque est **éphémère** : les fichiers
écrits peuvent disparaître au redémarrage ou au redéploiement. Pour que les
vidéos survivent dans la durée, ajoute un volume persistant sur Railway :

1. Dans le tableau de bord Railway, ouvre ton service web (celui créé à
   l'étape 3 de la mise en ligne)
2. Onglet "Volumes" → "Add Volume"
3. Donne-lui un point de montage, par exemple `/data`
4. Dans les "Variables" du service, ajoute `UPLOADS_DIR=/data`
5. Redéploie le service

À partir de là, les vidéos envoyées par les enseignants sont écrites sur ce
volume et restent en place même après un redémarrage ou un redéploiement.
Sans cette étape, tout fonctionne normalement mais les vidéos peuvent être
perdues au prochain redéploiement - à faire avant d'ouvrir la plateforme aux
vrais enseignants.

## Correction des copies et publication des notes

Après le dépôt des copies, l'enseignant choisit un sujet dans son espace
(`frontend/enseignant.html`), voit la liste des copies soumises, ouvre
chacune via son lien, puis publie une note sur 20 (avec un commentaire
optionnel). Les copies non soumises dans les temps affichent déjà leur note
automatique (0) et n'ont rien à corriger.

Côté étudiant, les notes publiées apparaissent dans `frontend/mes-notes.html`
(lien depuis le tableau de bord). API : `GET /api/sujets/mes-sujets`,
`GET /api/sujets/:id/copies`, `PATCH /api/sujets/copies/:copieId/note`,
`GET /api/sujets/mes-notes`.

## Programmes (standard + session intensive)

Deux programmes coexistent, chacun avec ses propres tarifs et ses propres
modules (table `programmes`) :
- **Standard** : accès toute l'année, 500F inscription + 5000F/mois
- **Session intensive** : "Cours et TD intensifs préparatoire au BTS",
  ouverte seulement **du 1er mai au 15 août, chaque année** (fenêtre
  récurrente calculée automatiquement, pas de date figée), 1000F
  inscription + 25000F pour toute la session

Un étudiant s'inscrit au programme standard automatiquement à la création
de son compte, et peut ensuite s'inscrire une seule fois à la session
intensive depuis `frontend/programmes.html` — le bouton d'inscription
n'apparaît que si la fenêtre est ouverte. L'unicité est garantie par la
table `inscriptions_programme` (une ligne par étudiant et par programme).

**Limite connue** : le tableau de progression de l'espace gestionnaire
compte actuellement les modules toutes filières confondues sans distinguer
standard/intensif — à affiner si besoin une fois les deux programmes en usage.

## Notifications, vérification du numéro, historique et sauvegardes

**Notifications internes** (`notifications` table + `frontend/notifications.html`,
badge sur le tableau de bord étudiant) : créées automatiquement quand une
question reçoit une réponse, qu'une note est publiée, ou qu'un abonnement
expire dans 2 jours ou moins (rappel envoyé une seule fois par abonnement,
tâche planifiée quotidienne à 8h - `src/jobs/rappelAbonnements.js`). Chaque
notification est aussi transmise à `src/utils/sms.js` pour un envoi SMS.

**Envoi de SMS et vérification par OTP** : `src/utils/sms.js` est préparé
pour un vrai fournisseur SMS (à brancher dans `envoyerViaFournisseur`, sur
le même principe que `src/utils/operateurs/`), mais **aucun fournisseur
n'est configuré par défaut**. Tant que `SMS_PROVIDER` n'est pas défini dans
`.env`, les messages sont seulement affichés dans les journaux du serveur
("mode console"), ce qui permet de tester tout le parcours (inscription,
rappels...) sans compte SMS payant. À l'inscription (étudiant et
enseignant), un code à 6 chiffres est envoyé et doit être vérifié avant de
pouvoir se connecter (`telephone_verifie`) ; en mode console, ce code est
renvoyé directement dans la réponse de l'API pour les tests - **à ne
jamais faire une fois un vrai fournisseur branché** (le code bascule alors
automatiquement en n'envoyant plus ce champ).

**Historique des paiements** : `frontend/mes-paiements.html`, API
`GET /api/paiements/mes-paiements`.

**Export PDF du relevé de notes** : bouton dans `frontend/mes-notes.html`,
généré par `pdfkit` côté serveur (`GET /api/sujets/mes-notes/pdf`).

**Sauvegardes de la base** : `scripts/sauvegarderBase.sh` (nécessite
`mysqldump`) écrit un export daté dans `sauvegardes/`. Ce script ne
s'exécute pas tout seul : pour l'automatiser, programme-le (ex. tâche cron
sur un serveur, ou service de cron de ton hébergeur) à la fréquence
souhaitée. Vérifie aussi si ton hébergeur propose des sauvegardes
automatiques de base de données en option (Railway le propose sur certains
plans) - souvent plus simple qu'un script à maintenir soi-même.

## Validation des enseignants

Un compte enseignant créé via `enseignant-inscription.html` reste **inactif**
(`statut_validation = 'en_attente'`) tant que le gestionnaire ne l'a pas
validé depuis `frontend/gestion.html`. La connexion est bloquée avec un
message explicite jusqu'à validation. Il doit aussi, comme l'étudiant,
vérifier son numéro par OTP avant de pouvoir se connecter.

## Ce qui est déjà fonctionnel

- Inscription liée à un numéro de téléphone unique + choix de la filière, auto-inscrite au programme standard
- Vérification du numéro par code OTP (SMS) à l'inscription, avant toute connexion
- Mot de passe oublié en libre-service, par code SMS
- Session intensive (mai-août) : inscription unique, tarifs distincts, fenêtre calculée automatiquement chaque année
- Connexion avec verrouillage à un seul appareil actif (reconnexion ailleurs = déconnexion automatique)
- Comptes enseignants soumis à validation par le gestionnaire avant de pouvoir se connecter
- Modules organisés par filière, programme et matière, déblocage progressif
- Questions des étudiants + réponses de l'enseignant en texte ou en audio
- Sujets d'examen chronométrés (upload par l'enseignant, dépôt de copie par l'étudiant)
- Clôture automatique toutes les 5 minutes : note 0 si le temps est écoulé sans copie soumise
- Correction des copies par l'enseignant et publication des notes (visibles par l'étudiant dans "Mes notes", exportables en PDF)
- Vidéo de synthèse par module envoyée par l'enseignant (0-30 min, 0-50 Mo, durée vérifiée côté navigateur puis serveur)
- Notifications internes (réponse à une question, note publiée, abonnement bientôt expiré) + envoi SMS si un fournisseur est branché
- Historique des paiements consultable par l'étudiant
- Script de sauvegarde de la base de données
- Espace gestionnaire : progression, absences, activité enseignants, validation des comptes enseignants
- Paiements (inscription/abonnement, montant selon le programme) : structure prête, à brancher aux vraies API

## Robustesse de la base de données

Quelques protections ajoutées au niveau du schéma, en plus de ce que le code
vérifie déjà :
- **Encodage `utf8mb4`** sur toutes les tables, pour garantir un affichage
  correct des accents français quelle que soit la configuration par défaut
  du serveur MySQL/MariaDB.
- **`reference_operateur` unique** dans `paiements` : si un opérateur de
  paiement envoie deux fois la confirmation d'une même transaction, la
  deuxième est rejetée au lieu de créer un deuxième abonnement pour un seul
  paiement réel.
- **Contrainte `CHECK`** sur `copies.note` (0 à 20) directement en base, en
  plus de la vérification déjà faite côté serveur.
- **Mot de passe oublié en libre-service** (`frontend/mot-de-passe-oublie.html`,
  `POST /api/auth/mot-de-passe-oublie`) : un étudiant ou enseignant peut
  changer son mot de passe lui-même via un code SMS, sans dépendre de toi
  ou du script `reinitialiserMotDePasse.js` (qui reste utile en secours,
  ex. si l'étudiant n'a plus accès à son numéro).

## Reste à faire

- Brancher les appels réels aux API CinetPay, MyNITA et AmanaTa dans `paiementController.js`
  (webhooks de confirmation à sécuriser avec la signature de chaque opérateur)
- Brancher un vrai fournisseur SMS dans `src/utils/sms.js` (`envoyerViaFournisseur`)
  pour que les notifications et codes OTP partent réellement par SMS
- Automatiser réellement l'exécution de `scripts/sauvegarderBase.sh` (cron externe ou option de l'hébergeur)
- Un vrai service de stockage objet (S3 ou équivalent) si le volume de vidéos grossit au-delà de ce qu'un volume Railway peut raisonnablement gérer
- Frontend (React ou HTML/CSS/JS mobile-first) consommant cette API
