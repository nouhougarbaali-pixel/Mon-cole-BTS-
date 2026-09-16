const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { envoyerSms } = require('../utils/sms');

const DUREE_VALIDITE_MINUTES = 10;

function genererCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 chiffres
}

// Envoie (ou renvoie) un code de vérification par SMS pour un numéro donné.
// En l'absence de fournisseur SMS configuré, le code est simplement journalisé
// côté serveur (voir src/utils/sms.js) - à utiliser pour les tests tant qu'un
// vrai fournisseur n'est pas branché.
async function envoyerCode(req, res) {
  try {
    const { telephone } = req.body;
    if (!telephone) {
      return res.status(400).json({ erreur: 'Numéro de téléphone requis' });
    }

    const code = genererCode();
    const expireLe = new Date(Date.now() + DUREE_VALIDITE_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO codes_otp (telephone, code, expire_le) VALUES (?, ?, ?)`,
      [telephone, code, expireLe]
    );

    const resultatEnvoi = await envoyerSms(telephone, `Ton code de vérification Mon école BTS : ${code} (valable ${DUREE_VALIDITE_MINUTES} min)`);

    // En mode "console" (aucun fournisseur SMS configuré), on renvoie le code
    // dans la réponse pour pouvoir tester le parcours - à ne jamais faire une
    // fois un vrai fournisseur branché (résultatEnvoi.mode devient 'fournisseur').
    const reponse = { ok: true };
    if (resultatEnvoi.mode === 'console') {
      reponse.avertissement = 'Aucun fournisseur SMS configuré - code renvoyé ici uniquement pour les tests';
      reponse.code_test = code;
    }

    res.json(reponse);
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'envoi du code', details: err.message });
  }
}

// Vérifie le code et marque le téléphone comme vérifié pour tout compte
// existant avec ce numéro.
async function verifierCode(req, res) {
  try {
    const { telephone, code } = req.body;
    if (!telephone || !code) {
      return res.status(400).json({ erreur: 'Numéro et code requis' });
    }

    const resultat = await pool.query(
      `SELECT * FROM codes_otp WHERE telephone = ? AND code = ? AND utilise = FALSE AND expire_le > NOW()
       ORDER BY cree_le DESC LIMIT 1`,
      [telephone, code]
    );

    if (resultat.rows.length === 0) {
      return res.status(400).json({ erreur: 'Code invalide ou expiré' });
    }

    await pool.query('UPDATE codes_otp SET utilise = TRUE WHERE id = ?', [resultat.rows[0].id]);
    await pool.query('UPDATE utilisateurs SET telephone_verifie = TRUE WHERE telephone = ?', [telephone]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la vérification du code', details: err.message });
  }
}

module.exports = { envoyerCode, verifierCode, reinitialiserMotDePasse };

// Mot de passe oublié, en libre-service : vérifie le code puis change
// directement le mot de passe (réutilise envoyerCode pour l'envoi du code -
// même endpoint que pour la vérification du numéro à l'inscription).
async function reinitialiserMotDePasse(req, res) {
  try {
    const { telephone, code, nouveau_mot_de_passe } = req.body;
    if (!telephone || !code || !nouveau_mot_de_passe || nouveau_mot_de_passe.length < 4) {
      return res.status(400).json({ erreur: 'Numéro, code et nouveau mot de passe (4 caractères minimum) requis' });
    }

    const resultat = await pool.query(
      `SELECT * FROM codes_otp WHERE telephone = ? AND code = ? AND utilise = FALSE AND expire_le > NOW()
       ORDER BY cree_le DESC LIMIT 1`,
      [telephone, code]
    );

    if (resultat.rows.length === 0) {
      return res.status(400).json({ erreur: 'Code invalide ou expiré' });
    }

    const existant = await pool.query('SELECT id FROM utilisateurs WHERE telephone = ?', [telephone]);
    if (existant.rows.length === 0) {
      return res.status(404).json({ erreur: 'Aucun compte associé à ce numéro' });
    }

    const motDePasseHash = await bcrypt.hash(nouveau_mot_de_passe, 10);

    await pool.query('UPDATE codes_otp SET utilise = TRUE WHERE id = ?', [resultat.rows[0].id]);
    await pool.query(
      'UPDATE utilisateurs SET mot_de_passe_hash = ?, appareil_actif_id = NULL WHERE telephone = ?',
      [motDePasseHash, telephone]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la réinitialisation', details: err.message });
  }
}
