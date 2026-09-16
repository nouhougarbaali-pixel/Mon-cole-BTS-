const pool = require('../config/db');
const fs = require('fs/promises');
const path = require('path');
const { DOSSIER_VIDEOS } = require('../config/upload');

// Liste des modules de la filière ET du programme de l'étudiant connecté
// (?programme=standard|intensif dans l'URL, "standard" par défaut), triés
// par ordre. Le déblocage progressif se fait ici : un module n'est "ouvert"
// que si l'étudiant a soumis une copie sur le module précédent, ou si c'est
// le premier de sa matière.
async function listerPourEtudiant(req, res) {
  try {
    const { filiere_id, id: utilisateur_id } = req.utilisateur;
    const codeProgramme = req.query.programme || 'standard';

    const programme = await pool.query('SELECT id FROM programmes WHERE code = ?', [codeProgramme]);
    if (programme.rows.length === 0) {
      return res.status(400).json({ erreur: 'Programme invalide' });
    }
    const programme_id = programme.rows[0].id;

    const inscription = await pool.query(
      'SELECT id FROM inscriptions_programme WHERE utilisateur_id = ? AND programme_id = ?',
      [utilisateur_id, programme_id]
    );
    if (inscription.rows.length === 0) {
      return res.status(403).json({ erreur: 'Tu n\'es pas inscrit à ce programme' });
    }

    const modules = await pool.query(
      'SELECT * FROM modules WHERE filiere_id = ? AND programme_id = ? ORDER BY matiere, ordre',
      [filiere_id, programme_id]
    );

    // Pour chaque module, vérifie si l'étudiant a une copie soumise sur un
    // sujet de ce module (sert de critère simple de progression).
    const copies = await pool.query(
      `SELECT s.module_id, c.statut FROM copies c
       JOIN sujets s ON s.id = c.sujet_id
       WHERE c.utilisateur_id = ?`,
      [utilisateur_id]
    );

    const modulesTraites = modules.rows.map((module, index) => {
      const dejaTraite = index === 0 || copies.rows.some(
        c => c.module_id === modules.rows[index - 1].id && c.statut === 'soumis'
      );
      return { ...module, verrouille: !dejaTraite };
    });

    res.json({ modules: modulesTraites });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des modules', details: err.message });
  }
}

// Ajout d'un module par un enseignant, rattaché à une filière et un programme
async function creer(req, res) {
  try {
    const { filiere_id, programme_id, matiere, titre, ordre, support_url, audio_url } = req.body;

    const creation = await pool.query(
      `INSERT INTO modules (filiere_id, programme_id, matiere, titre, ordre, support_url, audio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [filiere_id, programme_id, matiere, titre, ordre || 1, support_url, audio_url]
    );

    const module = await pool.query('SELECT * FROM modules WHERE id = ?', [creation.insertId]);
    res.status(201).json({ module: module.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la création du module', details: err.message });
  }
}

const DUREE_MAX_SECONDES = 30 * 60; // 30 minutes

// L'enseignant envoie une vidéo de synthèse pour un module existant.
// Contraintes : 0 à 30 minutes, 0 à 50 Mo. La taille est vérifiée par Multer
// (voir src/config/upload.js) avant même d'arriver ici ; la durée est
// mesurée côté navigateur par le frontend et revérifiée ici. Sans un outil
// comme ffmpeg côté serveur, la durée déclarée par le client ne peut pas
// être re-mesurée à partir du fichier lui-même - amélioration possible plus tard.
async function televerserVideoSynthese(req, res) {
  try {
    const { id } = req.params; // id du module
    const dureeSecondes = Number(req.body.duree_secondes);

    if (!req.file) {
      return res.status(400).json({ erreur: 'Aucun fichier vidéo reçu' });
    }

    if (!Number.isFinite(dureeSecondes) || dureeSecondes < 0 || dureeSecondes > DUREE_MAX_SECONDES) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ erreur: 'La vidéo doit durer entre 0 et 30 minutes' });
    }

    const module = await pool.query('SELECT * FROM modules WHERE id = ?', [id]);
    if (module.rows.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ erreur: 'Module introuvable' });
    }

    // Remplace l'ancienne vidéo si une nouvelle est envoyée pour le même module
    if (module.rows[0].video_synthese_url) {
      const ancienChemin = path.join(DOSSIER_VIDEOS, path.basename(module.rows[0].video_synthese_url));
      await fs.unlink(ancienChemin).catch(() => {});
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;
    await pool.query(
      `UPDATE modules SET video_synthese_url = ?, video_synthese_duree_secondes = ?, video_synthese_taille_octets = ?
       WHERE id = ?`,
      [videoUrl, dureeSecondes, req.file.size, id]
    );

    const moduleMisAJour = await pool.query('SELECT * FROM modules WHERE id = ?', [id]);
    res.status(201).json({ module: moduleMisAJour.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'envoi de la vidéo', details: err.message });
  }
}

module.exports = { listerPourEtudiant, creer, televerserVideoSynthese };
