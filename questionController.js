const pool = require('../config/db');
const { creerNotification } = require('./notificationController');

async function poser(req, res) {
  try {
    const { module_id, contenu_texte } = req.body;
    const utilisateur_id = req.utilisateur.id;

    const creation = await pool.query(
      `INSERT INTO questions (utilisateur_id, module_id, contenu_texte) VALUES (?, ?, ?)`,
      [utilisateur_id, module_id, contenu_texte]
    );

    const question = await pool.query('SELECT * FROM questions WHERE id = ?', [creation.insertId]);
    res.status(201).json({ question: question.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'envoi de la question', details: err.message });
  }
}

// Réponse de l'enseignant, en texte et/ou en audio
async function repondre(req, res) {
  try {
    const { id } = req.params;
    const { reponse_texte, reponse_audio_url } = req.body;

    const maj = await pool.query(
      `UPDATE questions SET reponse_texte = ?, reponse_audio_url = ?, repondu_le = NOW() WHERE id = ?`,
      [reponse_texte || null, reponse_audio_url || null, id]
    );

    if (maj.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Question introuvable' });
    }

    const question = await pool.query('SELECT * FROM questions WHERE id = ?', [id]);
    if (question.rows.length > 0) {
      await creerNotification(
        question.rows[0].utilisateur_id,
        'reponse_question',
        'Ta question a reçu une réponse - ouvre le module pour la consulter.'
      );
    }
    res.json({ question: question.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la réponse', details: err.message });
  }
}

// Questions en attente pour l'enseignant, filtrées par filière/module
async function listerEnAttente(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT q.*, u.nom AS etudiant_nom, m.titre AS module_titre
       FROM questions q
       JOIN utilisateurs u ON u.id = q.utilisateur_id
       JOIN modules m ON m.id = q.module_id
       WHERE q.reponse_texte IS NULL AND q.reponse_audio_url IS NULL
       ORDER BY q.cree_le ASC`
    );
    res.json({ questions: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des questions', details: err.message });
  }
}

module.exports = { poser, repondre, listerEnAttente };
