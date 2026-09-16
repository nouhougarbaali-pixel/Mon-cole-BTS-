-- Schéma de la plateforme de cours en ligne pour candidats au BTS
-- Compatible MySQL 8+ et MariaDB 10.5+
-- utf8mb4 partout : gère correctement les accents français (et les emojis)

CREATE TABLE filieres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,   -- PMO, GRH, CGE, TL, CE
  nom VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filiere_id INT,
  telephone VARCHAR(20) UNIQUE NOT NULL,
  nom VARCHAR(150) NOT NULL,
  role ENUM('etudiant', 'enseignant', 'admin') NOT NULL,
  mot_de_passe_hash TEXT NOT NULL,
  appareil_actif_id VARCHAR(64),       -- identifiant de session/appareil, un seul actif à la fois
  -- Pour les enseignants : le compte n'est utilisable qu'une fois validé par
  -- le gestionnaire. 'valide' par défaut pour étudiant/admin.
  statut_validation ENUM('en_attente', 'valide', 'refuse') NOT NULL DEFAULT 'valide',
  -- Vérifié par code OTP envoyé par SMS à l'inscription (voir table codes_otp).
  telephone_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (filiere_id) REFERENCES filieres(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Programmes proposés sur la plateforme : le programme standard (accès
-- continu à l'année) et la session intensive (fenêtre récurrente chaque
-- année, du 1er mai au 15 août). mois_jour_* au format 'MM-DD', NULL pour
-- le programme standard qui n'a pas de fenêtre limitée.
CREATE TABLE programmes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,          -- 'standard', 'intensif'
  nom VARCHAR(150) NOT NULL,
  mois_jour_debut CHAR(5),                   -- ex. '05-01'
  mois_jour_fin CHAR(5),                     -- ex. '08-15'
  frais_inscription INT NOT NULL,
  frais_abonnement INT NOT NULL,
  type_abonnement ENUM('mensuel', 'unique') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filiere_id INT NOT NULL,
  programme_id INT NOT NULL,
  matiere VARCHAR(150) NOT NULL,      -- ex. "Comptabilité générale"
  titre VARCHAR(200) NOT NULL,
  ordre INT NOT NULL DEFAULT 1,       -- pour le déblocage progressif
  support_url TEXT,
  audio_url TEXT,
  -- Vidéo de synthèse envoyée par l'enseignant vacataire : 0-30 minutes,
  -- 0-50 Mo (contraintes appliquées côté serveur à l'envoi).
  video_synthese_url TEXT,
  video_synthese_duree_secondes INT,
  video_synthese_taille_octets INT,
  cree_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (filiere_id) REFERENCES filieres(id),
  FOREIGN KEY (programme_id) REFERENCES programmes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une ligne par étudiant et par programme : garantit l'inscription unique
-- ("chaque étudiant doit s'inscrire une fois") à chaque programme.
CREATE TABLE inscriptions_programme (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  programme_id INT NOT NULL,
  inscrit_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (utilisateur_id, programme_id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (programme_id) REFERENCES programmes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abonnements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  debut DATE NOT NULL,
  fin DATE NOT NULL,
  statut ENUM('actif', 'expire') NOT NULL DEFAULT 'actif',
  rappel_envoye BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE paiements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  programme_id INT NOT NULL,
  type ENUM('inscription', 'abonnement') NOT NULL,
  montant INT NOT NULL,                -- dépend du programme (voir table programmes)
  operateur VARCHAR(30) NOT NULL,      -- cinetpay, mynita, amanata
  -- Unique (hors valeurs NULL) : si l'opérateur envoie deux fois la même
  -- confirmation de transaction, la deuxième est rejetée au lieu de créer
  -- un deuxième abonnement pour un seul paiement réel.
  reference_operateur VARCHAR(100) UNIQUE,
  statut ENUM('en_attente', 'reussi', 'echoue') NOT NULL DEFAULT 'en_attente',
  cree_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (programme_id) REFERENCES programmes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  module_id INT NOT NULL,
  contenu_texte TEXT NOT NULL,
  reponse_texte TEXT,
  reponse_audio_url TEXT,
  repondu_le TIMESTAMP NULL,
  cree_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (module_id) REFERENCES modules(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sujets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  enseignant_id INT NOT NULL,
  titre VARCHAR(200) NOT NULL,
  fichier_url TEXT NOT NULL,
  duree_minutes INT NOT NULL,
  date_publication TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES modules(id),
  FOREIGN KEY (enseignant_id) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE copies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sujet_id INT NOT NULL,
  utilisateur_id INT NOT NULL,
  fichier_url TEXT,
  date_soumission TIMESTAMP NULL,
  statut ENUM('en_cours', 'soumis', 'non_soumis') NOT NULL DEFAULT 'en_cours',
  note INT CHECK (note IS NULL OR (note >= 0 AND note <= 20)),
  commentaire TEXT,
  corrige_le TIMESTAMP NULL,
  UNIQUE (sujet_id, utilisateur_id),
  FOREIGN KEY (sujet_id) REFERENCES sujets(id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications internes (réponse à une question, note publiée, abonnement
-- bientôt expiré...). Affichées dans l'app ; envoyées aussi par SMS si un
-- fournisseur SMS est configuré (voir src/utils/sms.js).
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  type VARCHAR(30) NOT NULL,  -- 'reponse_question', 'note_publiee', 'abonnement_expire_bientot'
  message TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Codes de vérification envoyés par SMS : inscription (telephone_verifie)
-- et mot de passe oublié (les deux réutilisent cette même table).
CREATE TABLE codes_otp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telephone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expire_le TIMESTAMP NOT NULL,
  utilise BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_modules_filiere ON modules(filiere_id);
CREATE INDEX idx_modules_programme ON modules(programme_id);
CREATE INDEX idx_questions_module ON questions(module_id);
CREATE INDEX idx_copies_sujet ON copies(sujet_id);
CREATE INDEX idx_notifications_utilisateur ON notifications(utilisateur_id);
CREATE INDEX idx_codes_otp_telephone ON codes_otp(telephone);
