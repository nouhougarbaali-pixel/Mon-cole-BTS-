// Intégration Airtel Money via CinetPay - actif.
// Documentation : https://cinetpay.com/

async function initierPaiement({ montant, telephone_client, description }) {
  const reponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: `TX-${Date.now()}`,
      amount: montant,
      currency: 'XOF',
      description,
      customer_phone_number: telephone_client,
      channels: 'MOBILE_MONEY'
    })
  });

  return reponse.json();
}

module.exports = { initierPaiement };
