const express = require('express');
const router = express.Router();
const { inscrire, inscrireEnseignant, connecter } = require('../controllers/authController');
const { envoyerCode, verifierCode, reinitialiserMotDePasse } = require('../controllers/otpController');

router.post('/inscription', inscrire);
router.post('/inscription-enseignant', inscrireEnseignant);
router.post('/connexion', connecter);
router.post('/otp/envoyer', envoyerCode);
router.post('/otp/verifier', verifierCode);
router.post('/mot-de-passe-oublie', reinitialiserMotDePasse);

module.exports = router;
