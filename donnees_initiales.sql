INSERT INTO filieres (code, nom) VALUES
  ('PMO', 'Assistanat de direction / Management des organisations'),
  ('GRH', 'Gestion des Ressources Humaines'),
  ('CGE', 'Comptabilité et Gestion des Entreprises'),
  ('TL', 'Transport et Logistique'),
  ('CE', 'Commerce et Entreprise');

INSERT INTO programmes (code, nom, mois_jour_debut, mois_jour_fin, frais_inscription, frais_abonnement, type_abonnement) VALUES
  ('standard', 'Programme standard', NULL, NULL, 500, 5000, 'mensuel'),
  ('intensif', 'Cours et TD intensifs préparatoire au BTS', '05-01', '08-15', 1000, 25000, 'unique');
