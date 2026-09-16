const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { initier, confirmer, mesPaiements } = require('../controllers/paiementController');

router.post('/', verifierToken, initier);
router.get('/mes-paiements', verifierToken, mesPaiements);
router.post('/:id/confirmation', confirmer); // appelé par le webhook de l'opérateur, pas par le client

module.exports = router;
