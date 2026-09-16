const pool = require('../config/db');
const { creerNotification } = require('./notificationController');
const PDFDocument = require('pdfkit');

// L'enseignant publie un sujet type examen avec un temps de composition
async function publier(req, res) {
  try {
    const { module_id, titre, fichier_url, duree_minutes } = req.body;
    const enseignant_id = req.utilisateur.id;

    const creation = await pool.query(
      `INSERT INTO sujets (module_id, enseignant_id, titre, fichier_url, duree_minutes) VALUES (?, ?, ?, ?, ?)`,
      [module_id, enseignant_id, titre, fichier_url, duree_minutes]
    );

    const sujet = await pool.query('SELECT * FROM sujets WHERE id = ?', [creation.insertId]);
    res.status(201).json({ sujet: sujet.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la publication du sujet', details: err.message });
  }
}

// L'étudiant ouvre un sujet : crée sa ligne "copie" en_cours si elle n'existe pas encore
async function ouvrirPourEtudiant(req, res) {
  try {
    const { id } = req.params;
    const utilisateur_id = req.utilisateur.id;

    const sujet = await pool.query('SELECT * FROM sujets WHERE id = ?', [id]);
    if (sujet.rows.length === 0) {
      return res.status(404).json({ erreur: 'Sujet introuvable' });
    }

    const copieExistante = await pool.query(
      'SELECT * FROM copies WHERE sujet_id = ? AND utilisateur_id = ?',
      [id, utilisateur_id]
    );

    let copie;
    if (copieExistante.rows.length > 0) {
      copie = copieExistante.rows[0];
    } else {
      const creation = await pool.query(
        `INSERT INTO copies (sujet_id, utilisateur_id, statut) VALUES (?, ?, 'en_cours')`,
        [id, utilisateur_id]
      );
      const nouvelleCopie = await pool.query('SELECT * FROM copies WHERE id = ?', [creation.insertId]);
      copie = nouvelleCopie.rows[0];
    }

    const finComposition = new Date(sujet.rows[0].date_publication);
    finComposition.setMinutes(finComposition.getMinutes() + sujet.rows[0].duree_minutes);

    res.json({ sujet: sujet.rows[0], copie, fin_composition: finComposition });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'ouverture du sujet', details: err.message });
  }
}

// Dépôt de la copie par l'étudiant, uniquement si le temps n'est pas écoulé
async function soumettreCopie(req, res) {
  try {
    const { id } = req.params; // id du sujet
    const { fichier_url } = req.body;
    const utilisateur_id = req.utilisateur.id;

    const sujet = await pool.query('SELECT * FROM sujets WHERE id = ?', [id]);
    if (sujet.rows.length === 0) {
      return res.status(404).json({ erreur: 'Sujet introuvable' });
    }

    const finComposition = new Date(sujet.rows[0].date_publication);
    finComposition.setMinutes(finComposition.getMinutes() + sujet.rows[0].duree_minutes);

    if (new Date() > finComposition) {
      return res.status(403).json({ erreur: 'Le temps de composition est écoulé, la copie ne peut plus être déposée' });
    }

    await pool.query(
      `UPDATE copies SET fichier_url = ?, date_soumission = NOW(), statut = 'soumis'
       WHERE sujet_id = ? AND utilisateur_id = ?`,
      [fichier_url, id, utilisateur_id]
    );

    const copie = await pool.query(
      'SELECT * FROM copies WHERE sujet_id = ? AND utilisateur_id = ?',
      [id, utilisateur_id]
    );
    res.json({ copie: copie.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du dépôt de la copie', details: err.message });
  }
}

// Sujets publiés par l'enseignant connecté, avec le nombre de copies à corriger
async function listerPourEnseignant(req, res) {
  try {
    const enseignant_id = req.utilisateur.id;
    const resultat = await pool.query(
      `SELECT s.*,
        SUM(CASE WHEN c.statut = 'soumis' AND c.note IS NULL THEN 1 ELSE 0 END) AS a_corriger,
        SUM(CASE WHEN c.statut IN ('soumis', 'non_soumis') THEN 1 ELSE 0 END) AS total_copies
       FROM sujets s
       LEFT JOIN copies c ON c.sujet_id = s.id
       WHERE s.enseignant_id = ?
       GROUP BY s.id
       ORDER BY s.date_publication DESC`,
      [enseignant_id]
    );
    res.json({ sujets: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des sujets', details: err.message });
  }
}

// Copies d'un sujet donné, pour correction par l'enseignant
async function listerCopiesPourSujet(req, res) {
  try {
    const { id } = req.params; // id du sujet
    const resultat = await pool.query(
      `SELECT c.*, u.nom AS etudiant_nom, u.telephone
       FROM copies c
       JOIN utilisateurs u ON u.id = c.utilisateur_id
       WHERE c.sujet_id = ? AND c.statut IN ('soumis', 'non_soumis')
       ORDER BY (c.note IS NULL) DESC, u.nom`,
      [id]
    );
    res.json({ copies: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des copies', details: err.message });
  }
}

// L'enseignant publie la note d'une copie après correction (note sur 20, commentaire optionnel)
async function noterCopie(req, res) {
  try {
    const { copieId } = req.params;
    const { note, commentaire } = req.body;

    if (note === undefined || note === null || note < 0 || note > 20) {
      return res.status(400).json({ erreur: 'La note doit être comprise entre 0 et 20' });
    }

    const maj = await pool.query(
      `UPDATE copies SET note = ?, commentaire = ?, corrige_le = NOW()
       WHERE id = ? AND statut = 'soumis'`,
      [note, commentaire || null, copieId]
    );

    if (maj.affectedRows === 0) {
      return res.status(404).json({ erreur: 'Copie introuvable ou non soumise' });
    }

    const copie = await pool.query('SELECT * FROM copies WHERE id = ?', [copieId]);
    if (copie.rows.length > 0) {
      await creerNotification(
        copie.rows[0].utilisateur_id,
        'note_publiee',
        `Ta note pour cet examen est disponible : ${note}/20.`
      );
    }
    res.json({ copie: copie.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'enregistrement de la note', details: err.message });
  }
}

// Notes de l'étudiant connecté, une fois publiées par l'enseignant
async function listerNotesPourEtudiant(req, res) {
  try {
    const utilisateur_id = req.utilisateur.id;
    const resultat = await pool.query(
      `SELECT c.note, c.commentaire, c.corrige_le, c.statut, s.titre AS sujet_titre
       FROM copies c
       JOIN sujets s ON s.id = c.sujet_id
       WHERE c.utilisateur_id = ? AND c.note IS NOT NULL
       ORDER BY c.corrige_le DESC`,
      [utilisateur_id]
    );
    res.json({ notes: resultat.rows });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des notes', details: err.message });
  }
}

// Génère un relevé de notes en PDF pour l'étudiant connecté
async function exporterNotesPdf(req, res) {
  try {
    const utilisateur = req.utilisateur;

    const infoUtilisateur = await pool.query(
      `SELECT u.nom, f.code AS filiere FROM utilisateurs u
       LEFT JOIN filieres f ON f.id = u.filiere_id WHERE u.id = ?`,
      [utilisateur.id]
    );
    const notes = await pool.query(
      `SELECT c.note, c.commentaire, c.corrige_le, s.titre AS sujet_titre
       FROM copies c
       JOIN sujets s ON s.id = c.sujet_id
       WHERE c.utilisateur_id = ? AND c.note IS NOT NULL
       ORDER BY c.corrige_le DESC`,
      [utilisateur.id]
    );

    const nomEtudiant = infoUtilisateur.rows[0]?.nom || 'Étudiant';
    const filiere = infoUtilisateur.rows[0]?.filiere || '';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="releve-de-notes.pdf"');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text('Mon école BTS - Relevé de notes', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Étudiant : ${nomEtudiant}`);
    doc.text(`Filière : ${filiere}`);
    doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`);
    doc.moveDown();

    if (notes.rows.length === 0) {
      doc.text('Aucune note publiée pour le moment.');
    } else {
      notes.rows.forEach((n) => {
        doc.fontSize(12).text(`${n.sujet_titre} - ${n.note}/20`, { continued: false });
        if (n.commentaire) {
          doc.fontSize(10).fillColor('gray').text(n.commentaire);
          doc.fillColor('black');
        }
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de la génération du PDF', details: err.message });
  }
}

module.exports = {
  publier,
  ouvrirPourEtudiant,
  soumettreCopie,
  listerPourEnseignant,
  listerCopiesPourSujet,
  noterCopie,
  listerNotesPourEtudiant,
  exporterNotesPdf
};
