// Envoi de SMS - préparé pour un vrai fournisseur (à brancher dans la
// fonction envoyerViaFournisseur ci-dessous une fois un compte SMS obtenu,
// ex. l'API SMS d'un opérateur nigérien ou d'un agrégateur comme Twilio).
//
// Tant que SMS_PROVIDER n'est pas défini dans .env, la fonction bascule en
// mode "console" : le message est simplement affiché dans les journaux du
// serveur au lieu d'être réellement envoyé. Utile pour développer et tester
// tout le parcours (OTP, rappels...) sans dépendre d'un compte SMS payant.

async function envoyerViaFournisseur(telephone, message) {
  // TODO : une fois un fournisseur SMS choisi, remplacer ce bloc par le
  // véritable appel API (sur le même modèle que src/utils/operateurs/).
  throw new Error('Aucun fournisseur SMS configuré (SMS_PROVIDER)');
}

async function envoyerSms(telephone, message) {
  if (!process.env.SMS_PROVIDER) {
    console.log(`[SMS - mode console, aucun fournisseur configuré] À ${telephone} : ${message}`);
    return { envoye: false, mode: 'console' };
  }

  await envoyerViaFournisseur(telephone, message);
  return { envoye: true, mode: 'fournisseur' };
}

module.exports = { envoyerSms };
