require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./src/routes/authRoutes');
const filiereRoutes = require('./src/routes/filiereRoutes');
const moduleRoutes = require('./src/routes/moduleRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const sujetRoutes = require('./src/routes/sujetRoutes');
const paiementRoutes = require('./src/routes/paiementRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const programmeRoutes = require('./src/routes/programmeRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const cloturerCopiesExpirees = require('./src/jobs/cloturerCopiesExpirees');
const rappelAbonnements = require('./src/jobs/rappelAbonnements');
const { DOSSIER_RACINE, DOSSIER_VIDEOS } = require('./src/config/upload');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/filieres', filiereRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sujets', sujetRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/programmes', programmeRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/sante', (req, res) => res.json({ etat: 'ok' }));

// Dossier des fichiers envoyés (vidéos de synthèse) - créé au démarrage s'il
// n'existe pas. Pointe vers un volume persistant en production si UPLOADS_DIR
// est défini (voir README, section "Stockage persistant des vidéos").
fs.mkdirSync(DOSSIER_VIDEOS, { recursive: true });
app.use('/uploads', express.static(DOSSIER_RACINE));

// Sert le frontend statique - un seul service à héberger
app.use(express.static(path.join(__dirname, 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  cloturerCopiesExpirees.demarrer();
  rappelAbonnements.demarrer();
});
