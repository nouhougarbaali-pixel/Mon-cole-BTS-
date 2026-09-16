const express = require('express');
const router = express.Router();
const { verifierToken, verifierTokenOptionnel, exigerRole } = require('../middleware/auth');
const { lister, inscrire } = require('../controllers/programmeController');

router.get('/', verifierTokenOptionnel, lister); // public : pas besoin d'être connecté pour voir les tarifs
router.post('/:id/inscription', verifierToken, exigerRole('etudiant'), inscrire);

module.exports = router;
