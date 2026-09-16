const express = require('express');
const router = express.Router();
const { verifierToken, exigerRole } = require('../middleware/auth');
const { listerPourEtudiant, creer, televerserVideoSynthese } = require('../controllers/moduleController');
const { televerserVideo, TAILLE_MAX_OCTETS } = require('../config/upload');

router.get('/', verifierToken, listerPourEtudiant);
router.post('/', verifierToken, exigerRole('enseignant', 'admin'), creer);

router.post(
  '/:id/video-synthese',
  verifierToken,
  exigerRole('enseignant', 'admin'),
  (req, res, next) => {
    televerserVideo.single('video')(req, res, (err) => {
      if (err instanceof require('multer').MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          erreur: `La vidéo dépasse la taille maximale autorisée (${TAILLE_MAX_OCTETS / (1024 * 1024)} Mo)`
        });
      }
      if (err) {
        return res.status(400).json({ erreur: err.message });
      }
      next();
    });
  },
  televerserVideoSynthese
);

module.exports = router;
