-- Crée directement le compte gestionnaire (admin), mot de passe déjà défini.
-- À exécuter UNE SEULE FOIS, après schema.sql et donnees_initiales.sql :
--
--   mysql -u <utilisateur> -p -h <hote> -P <port> <nom_base> < sql/compte_gestionnaire.sql
--
-- Le mot de passe n'est jamais stocké en clair ici : seul son hash bcrypt
-- (irréversible) est inséré, le même format que si tu avais utilisé
-- scripts/creerAdmin.js. Une fois exécuté, connecte-toi avec :
--   Téléphone : 97843611
--   Mot de passe : celui que tu as choisi

INSERT INTO utilisateurs (telephone, nom, role, mot_de_passe_hash, telephone_verifie, statut_validation)
VALUES (
  '97843611',
  'Nouhou Garba Ali',
  'admin',
  '$2b$10$.JPChrEx9QeiQYZJ9F0gAe38mUubGo0hrFFocBGWRMdKG7BiedS26',
  TRUE,
  'valide'
);
