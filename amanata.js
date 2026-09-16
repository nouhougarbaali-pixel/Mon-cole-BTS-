// Intégration AmanaTa - EN ATTENTE.
// Numéro de compte déjà renseigné (+22797843611) dans .env : AMANATA_NUMERO_COMPTE.
// Il manque encore AMANATA_MERCHANT_ID et AMANATA_API_KEY (fournis par Amana à
// l'ouverture du compte marchand) avant de pouvoir activer ce module.
// Une fois ces identifiants obtenus, compléter initierPaiement ci-dessous
// avec l'appel réel à l'API AmanaTa, sur le même modèle que airtelMoney.js.

async function initierPaiement() {
  throw new Error('AmanaTa n\'est pas encore activé : AMANATA_MERCHANT_ID et AMANATA_API_KEY manquants');
}

module.exports = { initierPaiement };
