const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configurable via UPLOADS_DIR : en local, un simple dossier du projet ; en
// production, le chemin de montage d'un volume persistant (ex. Railway),
// pour que les vidéos survivent aux redémarrages/redéploiements du service.
const DOSSIER_RACINE = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', 'uploads');
const DOSSIER_VIDEOS = path.join(DOSSIER_RACINE, 'videos');
const TAILLE_MAX_OCTETS = 50 * 1024 * 1024; // 50 Mo

const stockage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOSSIER_VIDEOS),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.mp4';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  }
});

function filtreVideo(req, file, cb) {
  if (!file.mimetype.startsWith('video/')) {
    return cb(new Error('Seuls les fichiers vidéo sont acceptés'));
  }
  cb(null, true);
}

const televerserVideo = multer({
  storage: stockage,
  limits: { fileSize: TAILLE_MAX_OCTETS },
  fileFilter: filtreVideo
});

module.exports = { televerserVideo, DOSSIER_RACINE, DOSSIER_VIDEOS, TAILLE_MAX_OCTETS };
