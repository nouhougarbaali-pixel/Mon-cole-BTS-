const express = require('express');
const router = express.Router();
const { verifierToken, exigerRole } = require('../middleware/auth');
const {
  progression,
  absences,
  activiteEnseignants,
  enseignantsEnAttente,
  validerEnseignant,
  statistiquesQuestions
} = require('../controllers/adminController');

router.use(verifierToken, exigerRole('admin'));

router.get('/progression', progression);
router.get('/absences', absences);
router.get('/enseignants', activiteEnseignants);
router.get('/enseignants/en-attente', enseignantsEnAttente);
router.patch('/enseignants/:id/validation', validerEnseignant);
router.get('/questions', statistiquesQuestions);

module.exports = router;
