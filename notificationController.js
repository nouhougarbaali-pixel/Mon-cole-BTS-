const pool = require('../config/db');

// Crée une notification et tente de l'envoyer aussi par SMS (best-effort :
// si l'envoi SMS échoue ou n'est pas configuré, la notification reste
// visible dans l'app - voir src/utils/sms.js).
async function creerNotification(utilisateur_id, type, message) {
  await pool.query(
    `INSERT INTO notifications (utilisateur_id, type, message) VALUES (?, ?, ?)`,
    [utilisateur_id, type, message]
  );

  try {
    const utilisateur = await pool.query('SELECT telephone FROM utilisateurs WHERE id = ?', [utilisateur_id]);
    if (utilisateur.rows.length > 0) {
      const { envoyerSms } = require('../utils/sms');
      await envoyerSms(utilisateur.rows[0].telephone, message);
    }
  } catch (err) {
    console.error('Erreur lors de l\'envoi SMS de la notification :', err.message);
  }
}

async function lister(req, res) {
  try {
    const resultat = await pool.query(
      'SELECT * FROM notifications WHERE utilisateur_id = ? ORDER BY cree_le DESC LIMIT 50',
      [req.utilisateur.id]
    );
    res.json({ notifications: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des notifications', details: err.message });
  }
}

async function marquerLues(req, res) {
  try {
    await pool.query('UPDATE notifications SET lu = TRUE WHERE utilisateur_id = ?', [req.utilisateur.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la mise à jour des notifications', details: err.message });
  }
}

module.exports = { creerNotification, lister, marquerLues };
