const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

// Inscription : un compte = un numéro de téléphone unique + une filière
async function inscrire(req, res) {
  const { telephone, nom, mot_de_passe, filiere_id } = req.body;

  if (!telephone || !nom || !mot_de_passe || !filiere_id) {
    return res.status(400).json({ erreur: 'Tous les champs sont requis (téléphone, nom, mot de passe, filière)' });
  }

  try {
    const existant = await pool.query('SELECT id FROM utilisateurs WHERE telephone = ?', [telephone]);
    if (existant.rows.length > 0) {
      return res.status(409).json({ erreur: 'Ce numéro de téléphone est déjà associé à un compte' });
    }

    const motDePasseHash = await bcrypt.hash(mot_de_passe, 10);

    const creation = await pool.query(
      `INSERT INTO utilisateurs (filiere_id, telephone, nom, role, mot_de_passe_hash)
       VALUES (?, ?, ?, 'etudiant', ?)`,
      [filiere_id, telephone, nom, motDePasseHash]
    );

    const nouvelUtilisateur = { id: creation.insertId, telephone, nom, role: 'etudiant', filiere_id };

    // Inscrit automatiquement l'étudiant au programme standard (inscription
    // unique par programme - voir table inscriptions_programme).
    const programmeStandard = await pool.query(`SELECT id FROM programmes WHERE code = 'standard'`);
    if (programmeStandard.rows.length > 0) {
      await pool.query(
        `INSERT INTO inscriptions_programme (utilisateur_id, programme_id) VALUES (?, ?)`,
        [nouvelUtilisateur.id, programmeStandard.rows[0].id]
      );
    }

    // L'inscription elle-même déclenche le paiement de 500F, géré séparément
    // via /api/paiements après cette étape.
    res.status(201).json({ utilisateur: nouvelUtilisateur });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'inscription', details: err.message });
  }
}

// Inscription enseignant (vacataire) : gratuite, un compte = un numéro
// unique comme pour les étudiants, mais sans étape de paiement.
async function inscrireEnseignant(req, res) {
  const { telephone, nom, mot_de_passe } = req.body;

  if (!telephone || !nom || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Tous les champs sont requis (téléphone, nom, mot de passe)' });
  }

  try {
    const existant = await pool.query('SELECT id FROM utilisateurs WHERE telephone = ?', [telephone]);
    if (existant.rows.length > 0) {
      return res.status(409).json({ erreur: 'Ce numéro de téléphone est déjà associé à un compte' });
    }

    const motDePasseHash = await bcrypt.hash(mot_de_passe, 10);

    const creation = await pool.query(
      `INSERT INTO utilisateurs (telephone, nom, role, mot_de_passe_hash, statut_validation)
       VALUES (?, ?, 'enseignant', ?, 'en_attente')`,
      [telephone, nom, motDePasseHash]
    );

    res.status(201).json({
      utilisateur: { id: creation.insertId, telephone, nom, role: 'enseignant', statut_validation: 'en_attente' }
    });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'inscription', details: err.message });
  }
}

// Connexion : un seul appareil actif à la fois par compte
async function connecter(req, res) {
  const { telephone, mot_de_passe } = req.body;

  try {
    const resultat = await pool.query('SELECT * FROM utilisateurs WHERE telephone = ?', [telephone]);
    const utilisateur = resultat.rows[0];

    if (!utilisateur) {
      return res.status(401).json({ erreur: 'Numéro ou mot de passe incorrect' });
    }

    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe_hash);
    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Numéro ou mot de passe incorrect' });
    }

    if (utilisateur.role === 'enseignant' && utilisateur.statut_validation !== 'valide') {
      const message = utilisateur.statut_validation === 'en_attente'
        ? 'Ton compte enseignant est en attente de validation par le gestionnaire de la plateforme'
        : 'Ton compte enseignant n\'a pas été validé par le gestionnaire de la plateforme';
      return res.status(403).json({ erreur: message });
    }

    if (utilisateur.role !== 'admin' && !utilisateur.telephone_verifie) {
      return res.status(403).json({ erreur: 'Numéro de téléphone non vérifié. Vérifie-le par SMS avant de te connecter.' });
    }

    // Nouvel identifiant d'appareil : invalide automatiquement toute session précédente
    const nouvelAppareilId = crypto.randomUUID();
    await pool.query('UPDATE utilisateurs SET appareil_actif_id = ? WHERE id = ?', [
      nouvelAppareilId,
      utilisateur.id
    ]);

    const token = jwt.sign(
      {
        id: utilisateur.id,
        role: utilisateur.role,
        filiere_id: utilisateur.filiere_id,
        appareil_id: nouvelAppareilId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '30d' }
    );

    res.json({
      token,
      utilisateur: { id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role, telephone: utilisateur.telephone }
    });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la connexion', details: err.message });
  }
}

module.exports = { inscrire, inscrireEnseignant, connecter };
