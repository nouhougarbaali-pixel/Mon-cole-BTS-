const pool = require('../config/db');

// Vérifie si aujourd'hui (mois-jour) tombe dans la fenêtre récurrente
// [mois_jour_debut, mois_jour_fin] d'un programme. NULL des deux côtés = toujours disponible.
function estDansLaFenetre(moisJourDebut, moisJourFin) {
  if (!moisJourDebut || !moisJourFin) return true;
  const aujourdHui = new Date();
  const moisJourActuel = String(aujourdHui.getMonth() + 1).padStart(2, '0') + '-' + String(aujourdHui.getDate()).padStart(2, '0');
  return moisJourActuel >= moisJourDebut && moisJourActuel <= moisJourFin;
}

async function lister(req, res) {
  try {
    const programmes = await pool.query('SELECT * FROM programmes ORDER BY id');

    let inscriptions = [];
    if (req.utilisateur) {
      const resultat = await pool.query(
        'SELECT programme_id FROM inscriptions_programme WHERE utilisateur_id = ?',
        [req.utilisateur.id]
      );
      inscriptions = resultat.rows.map((r) => r.programme_id);
    }

    const programmesAvecStatut = programmes.rows.map((p) => ({
      ...p,
      disponible: estDansLaFenetre(p.mois_jour_debut, p.mois_jour_fin),
      deja_inscrit: inscriptions.includes(p.id)
    }));

    res.json({ programmes: programmesAvecStatut });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors du chargement des programmes', details: err.message });
  }
}

// Inscription unique de l'étudiant à un programme (ex. la session intensive)
async function inscrire(req, res) {
  try {
    const { id } = req.params;
    const utilisateur_id = req.utilisateur.id;

    const programme = await pool.query('SELECT * FROM programmes WHERE id = ?', [id]);
    if (programme.rows.length === 0) {
      return res.status(404).json({ erreur: 'Programme introuvable' });
    }

    if (!estDansLaFenetre(programme.rows[0].mois_jour_debut, programme.rows[0].mois_jour_fin)) {
      return res.status(403).json({ erreur: 'Les inscriptions à ce programme ne sont pas ouvertes actuellement' });
    }

    const dejaInscrit = await pool.query(
      'SELECT id FROM inscriptions_programme WHERE utilisateur_id = ? AND programme_id = ?',
      [utilisateur_id, id]
    );
    if (dejaInscrit.rows.length > 0) {
      return res.status(409).json({ erreur: 'Tu es déjà inscrit à ce programme' });
    }

    const creation = await pool.query(
      `INSERT INTO inscriptions_programme (utilisateur_id, programme_id) VALUES (?, ?)`,
      [utilisateur_id, id]
    );

    const inscription = await pool.query('SELECT * FROM inscriptions_programme WHERE id = ?', [creation.insertId]);
    res.status(201).json({ inscription: inscription.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur lors de l\'inscription au programme', details: err.message });
  }
}

module.exports = { lister, inscrire };
