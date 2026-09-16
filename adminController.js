const pool = require('../config/db');

// Progression des étudiants par filière : nombre de modules terminés sur le total
async function progression(req, res) {
  try {
    const resultat = await pool.query(`
      SELECT
        u.id AS utilisateur_id,
        u.nom,
        f.code AS filiere,
        (SELECT COUNT(*) FROM modules m WHERE m.filiere_id = u.filiere_id) AS total_modules,
        (
          SELECT COUNT(DISTINCT s.module_id)
          FROM copies c
          JOIN sujets s ON s.id = c.sujet_id
          WHERE c.utilisateur_id = u.id AND c.statut = 'soumis'
        ) AS modules_termines
      FROM utilisateurs u
      JOIN filieres f ON f.id = u.filiere_id
      WHERE u.role = 'etudiant'
      ORDER BY f.code, u.nom
    `);
    res.json({ progression: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du calcul de la progression', details: err.message });
  }
}

// "Absences" aux examens : copies non soumises dans les temps
async function absences(req, res) {
  try {
    const resultat = await pool.query(`
      SELECT
        c.id, c.note, c.statut,
        u.nom AS etudiant_nom, u.telephone,
        f.code AS filiere,
        s.titre AS sujet_titre, s.date_publication
      FROM copies c
      JOIN utilisateurs u ON u.id = c.utilisateur_id
      JOIN filieres f ON f.id = u.filiere_id
      JOIN sujets s ON s.id = c.sujet_id
      WHERE c.statut = 'non_soumis'
      ORDER BY s.date_publication DESC
    `);
    res.json({ absences: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des absences', details: err.message });
  }
}

// Activité des enseignants validés : sujets publiés par chacun.
// Note : la table questions ne garde pas trace de quel enseignant a répondu
// (une seule équipe enseignante y répond), donc les statistiques de questions
// sont globales et non par enseignant - voir statistiquesQuestions ci-dessous.
async function activiteEnseignants(req, res) {
  try {
    const resultat = await pool.query(`
      SELECT
        ens.id, ens.nom, ens.telephone,
        COUNT(DISTINCT s.id) AS sujets_publies,
        MAX(s.date_publication) AS dernier_sujet_le
      FROM utilisateurs ens
      LEFT JOIN sujets s ON s.enseignant_id = ens.id
      WHERE ens.role = 'enseignant' AND ens.statut_validation = 'valide'
      GROUP BY ens.id, ens.nom, ens.telephone
      ORDER BY ens.nom
    `);
    res.json({ enseignants: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement de l\'activité des enseignants', details: err.message });
  }
}

// Liste des comptes enseignants en attente de validation
async function enseignantsEnAttente(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT id, nom, telephone, cree_le FROM utilisateurs
       WHERE role = 'enseignant' AND statut_validation = 'en_attente'
       ORDER BY cree_le ASC`
    );
    res.json({ enseignants: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des enseignants en attente', details: err.message });
  }
}

// Le gestionnaire valide ou refuse un compte enseignant. Tant que ce n'est
// pas fait, le compte ne peut pas se connecter (voir authController.connecter).
async function validerEnseignant(req, res) {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'valide' ou 'refuse'

    if (!['valide', 'refuse'].includes(decision)) {
      return res.status(400).json({ erreur: 'Décision invalide' });
    }

    const maj = await pool.query(
      `UPDATE utilisateurs SET statut_validation = ? WHERE id = ? AND role = 'enseignant'`,
      [decision, id]
    );

    if (maj.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Compte enseignant introuvable' });
    }

    const utilisateur = await pool.query(
      'SELECT id, nom, telephone, statut_validation FROM utilisateurs WHERE id = ?',
      [id]
    );
    res.json({ utilisateur: utilisateur.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la validation', details: err.message });
  }
}

// Statistiques globales des questions (toutes filières confondues)
async function statistiquesQuestions(req, res) {
  try {
    const resultat = await pool.query(`
      SELECT
        SUM(CASE WHEN reponse_texte IS NOT NULL OR reponse_audio_url IS NOT NULL THEN 1 ELSE 0 END) AS repondues,
        SUM(CASE WHEN reponse_texte IS NULL AND reponse_audio_url IS NULL THEN 1 ELSE 0 END) AS en_attente
      FROM questions
    `);
    res.json({ statistiques: resultat.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des statistiques', details: err.message });
  }
}

module.exports = {
  progression,
  absences,
  activiteEnseignants,
  enseignantsEnAttente,
  validerEnseignant,
  statistiquesQuestions
};
