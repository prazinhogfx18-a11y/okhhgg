// Vercel Serverless Function — GladePay: criar depósito PIX
// POST /api/gp-deposito
// Body: { amountCents, reference, callbackUrl, customerName, description }
//
// Faz proxy para POST https://app.gladepay.com.br/v1/deposito.
// A chave da GladePay fica SOMENTE no servidor (nunca é exposta ao browser).

const GP_API_BASE = 'https://app.gladepay.com.br/v1';
// Prefira configurar a env var GLADEPAY_API_KEY no painel da Vercel.
// O fallback mantém o funcionamento caso a env var ainda não exista.
const GP_API_KEY  = process.env.GLADEPAY_API_KEY || 'gp_live_hmVHJH7GV4eTWqnaxx069vNHPZ3sGjeI';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const amountCents = parseInt(body.amountCents, 10);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: 'amountCents inválido' });
    }

    // Monta payload apenas com campos aceitos pela GladePay
    const payload = { amountCents };
    if (body.reference)    payload.reference    = String(body.reference);
    if (body.callbackUrl)  payload.callbackUrl  = String(body.callbackUrl);
    if (body.customerName) payload.customerName = String(body.customerName);
    if (body.customerEmail) payload.customerEmail = String(body.customerEmail);
    if (body.description)  payload.description  = String(body.description);

    console.log('GladePay request:', { payload, apiKey: GP_API_KEY ? 'presente' : 'ausente' });

    const gpRes = await fetch(`${GP_API_BASE}/deposito`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GP_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await gpRes.json().catch(() => ({}));
    
    console.log('GladePay response:', { status: gpRes.status, ok: gpRes.ok, data });

    if (!gpRes.ok) {
      console.error('GladePay deposito erro:', gpRes.status, data);
      return res.status(gpRes.status || 500).json({ 
        error: 'Falha ao gerar PIX', 
        detail: data,
        statusCode: gpRes.status 
      });
    }

    // Valida resposta mínima
    if (!data.qrCodeText && !data.copy_past) {
      console.error('GladePay resposta sem QR code:', data);
      return res.status(500).json({ 
        error: 'Resposta da GladePay incompleta (sem código PIX)',
        detail: data 
      });
    }

    // Devolve ao browser SOMENTE o necessário — nunca a chave.
    return res.status(200).json({
      ok:           true,
      publicId:     data.publicId || data.txId || null,
      txId:         data.txId || data.publicId || null,
      status:       data.status || 'CREATED',
      amountCents:  data.amountCents,
      qrCodeText:   data.qrCodeText || data.copy_past || null,
      qrCodeUrl:    data.qrCodeUrl || null,
      qrCodeBase64: data.qrCodeBase64 || null,
      expiresAt:    data.expiresAt || null
    });
  } catch (err) {
    console.error('gp-deposito error:', err);
    return res.status(500).json({ error: err.message });
  }
};
