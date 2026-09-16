const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function verifierToken(req, res, next) {
  const enTete = req.headers.authorization;
  if (!enTete || !enTete.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Authentification requise' });
  }

  const token = enTete.split(' ')[1];
  try {
    const donnees = jwt.verify(token, process.env.JWT_SECRET);

    // Un seul appareil actif à la fois : si quelqu'un s'est reconnecté ailleurs,
    // l'appareil_actif_id en base ne correspond plus à celui du jeton.
    const resultat = await pool.query('SELECT appareil_actif_id FROM utilisateurs WHERE id = ?', [donnees.id]);
    const utilisateur = resultat.rows[0];

    if (!utilisateur || utilisateur.appareil_actif_id !== donnees.appareil_id) {
      return res.status(401).json({ erreur: 'Ce compte est connecté depuis un autre appareil' });
    }

    req.utilisateur = donnees;
    next();
  } catch (err) {
    return res.status(401).json({ erreur: 'Session invalide ou expirée' });
  }
}

// Comme verifierToken, mais ne bloque jamais la requête : utile pour des
// routes publiques (ex. liste des programmes) qui personnalisent juste
// l'affichage si l'utilisateur est connecté.
async function verifierTokenOptionnel(req, res, next) {
  const enTete = req.headers.authorization;
  if (!enTete || !enTete.startsWith('Bearer ')) {
    return next();
  }

  const token = enTete.split(' ')[1];
  try {
    const donnees = jwt.verify(token, process.env.JWT_SECRET);
    const resultat = await pool.query('SELECT appareil_actif_id FROM utilisateurs WHERE id = ?', [donnees.id]);
    const utilisateur = resultat.rows[0];
    if (utilisateur && utilisateur.appareil_actif_id === donnees.appareil_id) {
      req.utilisateur = donnees;
    }
  } catch (err) {
    // jeton invalide : on continue simplement sans utilisateur connecté
  }
  next();
}

function exigerRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ erreur: 'Accès non autorisé pour ce rôle' });
    }
    next();
  };
}

module.exports = { verifierToken, verifierTokenOptionnel, exigerRole };
