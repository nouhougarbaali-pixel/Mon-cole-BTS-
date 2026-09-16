const pool = require('../config/db');
const airtelMoney = require('../utils/operateurs/airtelMoney');
const mynita = require('../utils/operateurs/mynita');
const amanata = require('../utils/operateurs/amanata');

const OPERATEURS = {
  airtel_money: airtelMoney,
  mynita: mynita,
  amanata: amanata
};

// Initie un paiement : le montant est déterminé par le programme choisi
// (standard : 500F/5000F ; session intensive : 1000F/25000F), jamais par un
// montant envoyé par le client, pour éviter toute manipulation.
async function initier(req, res) {
  try {
    const { type, operateur, telephone_client, programme_id } = req.body;
    const utilisateur_id = req.utilisateur.id;

    if (!['inscription', 'abonnement'].includes(type)) {
      return res.status(400).json({ erreur: 'Type de paiement invalide' });
    }

    const moduleOperateur = OPERATEURS[operateur];
    if (!moduleOperateur) {
      return res.status(400).json({ erreur: 'Opérateur de paiement invalide' });
    }

    const programme = await pool.query('SELECT * FROM programmes WHERE id = ?', [programme_id]);
    if (programme.rows.length === 0) {
      return res.status(400).json({ erreur: 'Programme invalide' });
    }

    const montant = type === 'inscription' ? programme.rows[0].frais_inscription : programme.rows[0].frais_abonnement;

    const creation = await pool.query(
      `INSERT INTO paiements (utilisateur_id, programme_id, type, montant, operateur, statut)
       VALUES (?, ?, ?, ?, ?, 'en_attente')`,
      [utilisateur_id, programme_id, type, montant, operateur]
    );

    const paiement = await pool.query('SELECT * FROM paiements WHERE id = ?', [creation.insertId]);

    const reponseOperateur = await moduleOperateur.initierPaiement({
      montant,
      telephone_client,
      description: `${type === 'inscription' ? 'Inscription' : 'Abonnement'} ${programme.rows[0].nom} - Mon école BTS`
    });

    res.status(201).json({ paiement: paiement.rows[0], operateur: reponseOperateur });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'initiation du paiement', details: err.message });
  }
}

// Appelé par le webhook de l'opérateur de paiement une fois la transaction confirmée
async function confirmer(req, res) {
  try {
    const { id } = req.params;
    const { reference_operateur, statut } = req.body;

    const maj = await pool.query(
      `UPDATE paiements SET statut = ?, reference_operateur = ? WHERE id = ?`,
      [statut, reference_operateur, id]
    );

    if (maj.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Paiement introuvable' });
    }

    const paiement = await pool.query('SELECT * FROM paiements WHERE id = ?', [id]);

    // Si c'est un paiement d'abonnement réussi, on active l'abonnement.
    // Programme "mensuel" (standard) : 1 mois. Programme "unique" (session
    // intensive) : valable jusqu'au 15 août de l'année en cours.
    if (statut === 'reussi' && paiement.rows[0].type === 'abonnement') {
      const programme = await pool.query('SELECT * FROM programmes WHERE id = ?', [paiement.rows[0].programme_id]);
      const typeAbonnement = programme.rows[0]?.type_abonnement;

      const requeteFin = typeAbonnement === 'unique'
        ? `CAST(CONCAT(YEAR(CURDATE()), '-08-15') AS DATE)`
        : `DATE_ADD(CURDATE(), INTERVAL 1 MONTH)`;

      await pool.query(
        `INSERT INTO abonnements (utilisateur_id, debut, fin, statut)
         VALUES (?, CURDATE(), ${requeteFin}, 'actif')`,
        [paiement.rows[0].utilisateur_id]
      );
    }

    res.json({ paiement: paiement.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la confirmation du paiement', details: err.message });
  }
}

// Historique des paiements de l'étudiant connecté
async function mesPaiements(req, res) {
  try {
    const resultat = await pool.query(
      `SELECT p.*, pr.nom AS programme_nom
       FROM paiements p
       JOIN programmes pr ON pr.id = p.programme_id
       WHERE p.utilisateur_id = ?
       ORDER BY p.cree_le DESC`,
      [req.utilisateur.id]
    );
    res.json({ paiements: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement de l\'historique', details: err.message });
  }
}

module.exports = { initier, confirmer, mesPaiements };
