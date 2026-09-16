const express = require('express');
const router = express.Router();
const { verifierToken, exigerRole } = require('../middleware/auth');
const { poser, repondre, listerEnAttente } = require('../controllers/questionController');

router.post('/', verifierToken, exigerRole('etudiant'), poser);
router.get('/en-attente', verifierToken, exigerRole('enseignant', 'admin'), listerEnAttente);
router.patch('/:id/reponse', verifierToken, exigerRole('enseignant', 'admin'), repondre);

module.exports = router;
