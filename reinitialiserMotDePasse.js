// Réinitialise le mot de passe d'un compte existant, à partir de son numéro
// de téléphone. Utile si tu as oublié le mot de passe de ton compte
// gestionnaire (ou tout autre compte).
//
// Utilisation :
//   node scripts/reinitialiserMotDePasse.js "97843611" "nouveau-mot-de-passe"

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function main() {
  const [telephone, nouveauMotDePasse] = process.argv.slice(2);

  if (!telephone || !nouveauMotDePasse) {
    console.error('Utilisation : node scripts/reinitialiserMotDePasse.js "<telephone>" "<nouveau_mot_de_passe>"');
    process.exit(1);
  }

  const existant = await pool.query(
    'SELECT id, nom, role FROM utilisateurs WHERE telephone = ?',
    [telephone]
  );

  if (existant.rows.length === 0) {
    console.error('Aucun compte trouvé avec ce numéro de téléphone.');
    process.exit(1);
  }

  const motDePasseHash = await bcrypt.hash(nouveauMotDePasse, 10);

  await pool.query(
    'UPDATE utilisateurs SET mot_de_passe_hash = ?, appareil_actif_id = NULL WHERE telephone = ?',
    [motDePasseHash, telephone]
  );

  console.log('Mot de passe réinitialisé pour :', existant.rows[0]);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
