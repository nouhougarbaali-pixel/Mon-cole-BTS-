// Intégration MyNITA - EN ATTENTE.
// Numéro de compte déjà renseigné (+22797843611) dans .env : MYNITA_NUMERO_COMPTE.
// Il manque encore MYNITA_MERCHANT_ID et MYNITA_API_KEY (fournis par NITA à
// l'ouverture du compte marchand) avant de pouvoir activer ce module.
// Une fois ces identifiants obtenus, compléter initierPaiement ci-dessous
// avec l'appel réel à l'API MyNITA, sur le même modèle que airtelMoney.js.

async function initierPaiement() {
  throw new Error('MyNITA n\'est pas encore activé : MYNITA_MERCHANT_ID et MYNITA_API_KEY manquants');
}

module.exports = { initierPaiement };
