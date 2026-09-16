const cron = require('node-cron');
const pool = require('../config/db');
const { creerNotification } = require('../controllers/notificationController');

// Chaque jour à 8h : notifie les étudiants dont l'abonnement actif expire
// dans 2 jours ou moins, une seule fois par abonnement (rappel_envoye).
function demarrer() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const resultat = await pool.query(`
        SELECT id, utilisateur_id, fin FROM abonnements
        WHERE statut = 'actif' AND rappel_envoye = FALSE
          AND fin <= DATE_ADD(CURDATE(), INTERVAL 2 DAY)
      `);

      for (const abonnement of resultat.rows) {
        await creerNotification(
          abonnement.utilisateur_id,
          'abonnement_expire_bientot',
          `Ton abonnement expire le ${new Date(abonnement.fin).toLocaleDateString('fr-FR')}. Pense à le renouveler pour garder l'accès à tes modules.`
        );
        await pool.query('UPDATE abonnements SET rappel_envoye = TRUE WHERE id = ?', [abonnement.id]);
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi des rappels d\'abonnement :', err.message);
    }
  });
}

module.exports = { demarrer };
