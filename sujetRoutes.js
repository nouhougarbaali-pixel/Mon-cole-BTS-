const express = require('express');
const router = express.Router();
const { verifierToken, exigerRole } = require('../middleware/auth');
const {
  publier,
  ouvrirPourEtudiant,
  soumettreCopie,
  listerPourEnseignant,
  listerCopiesPourSujet,
  noterCopie,
  listerNotesPourEtudiant,
  exporterNotesPdf
} = require('../controllers/sujetController');

router.post('/', verifierToken, exigerRole('enseignant', 'admin'), publier);
router.get('/mes-sujets', verifierToken, exigerRole('enseignant', 'admin'), listerPourEnseignant);
router.get('/mes-notes', verifierToken, exigerRole('etudiant'), listerNotesPourEtudiant);
router.get('/mes-notes/pdf', verifierToken, exigerRole('etudiant'), exporterNotesPdf);
router.get('/:id/ouvrir', verifierToken, exigerRole('etudiant'), ouvrirPourEtudiant);
router.post('/:id/copie', verifierToken, exigerRole('etudiant'), soumettreCopie);
router.get('/:id/copies', verifierToken, exigerRole('enseignant', 'admin'), listerCopiesPourSujet);
router.patch('/copies/:copieId/note', verifierToken, exigerRole('enseignant', 'admin'), noterCopie);

module.exports = router;
