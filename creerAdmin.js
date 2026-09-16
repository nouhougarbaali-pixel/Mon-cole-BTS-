// Crée le compte du gestionnaire de la plateforme (rôle "admin").
// Ce rôle n'a volontairement pas de formulaire d'inscription public :
// on le crée directement en base via ce script, à exécuter une seule fois.
//
// Utilisation :
//   node scripts/creerAdmin.js "97843611" "Nouhou Garba Ali" "mot-de-passe-a-toi"

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function main() {
  const [telephone, nom, motDePasse] = process.argv.slice(2);

  if (!telephone || !nom || !motDePasse) {
    console.error('Utilisation : node scripts/creerAdmin.js "<telephone>" "<nom>" "<mot_de_passe>"');
    process.exit(1);
  }

  const existant = await pool.query('SELECT id FROM utilisateurs WHERE telephone = ?', [telephone]);
  if (existant.rows.length > 0) {
    console.error('Ce numéro de téléphone a déjà un compte sur la plateforme.');
    process.exit(1);
  }

  const motDePasseHash = await bcrypt.hash(motDePasse, 10);

  const creation = await pool.query(
    `INSERT INTO utilisateurs (telephone, nom, role, mot_de_passe_hash) VALUES (?, ?, 'admin', ?)`,
    [telephone, nom, motDePasseHash]
  );

  console.log('Compte gestionnaire créé :', { id: creation.insertId, telephone, nom });
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
