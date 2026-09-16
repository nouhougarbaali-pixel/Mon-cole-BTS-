const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.DATABASE_URL);

// Compatibilité avec le style "resultat.rows" utilisé dans les contrôleurs
// (mysql2 renvoie [rows, fields] par défaut, et un objet différent selon
// qu'il s'agit d'un SELECT ou d'un INSERT/UPDATE/DELETE).
async function query(sql, params = []) {
  const [resultat] = await pool.query(sql, params);

  if (Array.isArray(resultat)) {
    // SELECT : resultat est déjà le tableau des lignes
    return { rows: resultat };
  }

  // INSERT/UPDATE/DELETE : resultat est un objet (insertId, affectedRows...)
  return { rows: [], insertId: resultat.insertId, affectedRows: resultat.affectedRows };
}

module.exports = { query };
