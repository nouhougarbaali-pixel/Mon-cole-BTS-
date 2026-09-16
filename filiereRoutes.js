const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const resultat = await pool.query('SELECT * FROM filieres ORDER BY code');
    res.json({ filieres: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des filières', details: err.message });
  }
});

module.exports = router;
