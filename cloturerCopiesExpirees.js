const cron = require('node-cron');
const pool = require('../config/db');

// Toutes les 5 minutes : pour chaque sujet dont le temps de composition est
// écoulé, toute copie non soumise passe au statut "non_soumis" avec note 0.
function demarrer() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Cas 1 : l'étudiant avait ouvert le sujet mais n'a rien soumis
      await pool.query(`
        UPDATE copies
        SET statut = 'non_soumis', note = 0
        WHERE statut = 'en_cours'
          AND sujet_id IN (
            SELECT s.id FROM sujets s
            WHERE DATE_ADD(s.date_publication, INTERVAL s.duree_minutes MINUTE) < NOW()
          )
      `);

      // Cas 2 : l'étudiant n'a même jamais ouvert le sujet, aucune ligne "copie"
      // n'existe encore pour lui — on la crée directement à zéro.
      await pool.query(`
        INSERT INTO copies (sujet_id, utilisateur_id, statut, note)
        SELECT s.id, u.id, 'non_soumis', 0
        FROM sujets s
        JOIN modules m ON m.id = s.module_id
        JOIN utilisateurs u ON u.filiere_id = m.filiere_id AND u.role = 'etudiant'
        WHERE DATE_ADD(s.date_publication, INTERVAL s.duree_minutes MINUTE) < NOW()
          AND NOT EXISTS (
            SELECT 1 FROM copies c WHERE c.sujet_id = s.id AND c.utilisateur_id = u.id
          )
      `);
    } catch (err) {
      console.error('Erreur lors de la clôture des copies expirées :', err.message);
    }
  });
}

module.exports = { demarrer };
