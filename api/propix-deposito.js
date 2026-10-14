// Vercel Serverless Function — Propix: criar depósito PIX
// POST /api/propix-deposito
// Body: { amount, description, payerName, payerDocument }
//
// Faz proxy para POST https://api.propixbr.com/api/v1/deposit
// As credenciais ficam SOMENTE no servidor (nunca expostas ao browser).

const PROPIX_API_BASE = 'https://api.propixbr.com';
const PROPIX_CLIENT_ID = process.env.PROPIX_CLIENT_ID || 'live_d4df0cae17af548869dcb5fbbb03a8bb';
const PROPIX_CLIENT_SECRET = process.env.PROPIX_CLIENT_SECRET || 'sk_965ed1149f632f2ce3dd5fa3e24660d4ad6a41bfd04fa0e2292d8c4a44eef840';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const amount = parseFloat(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'amount inválido' });
    }

    if (!body.payerName || !body.payerDocument) {
      return res.status(400).json({ error: 'payerName e payerDocument são obrigatórios' });
    }

    // Monta payload para a Propix
    const payload = {
      amount: amount,
      description: body.description || 'Pagamento',
      payerName: String(body.payerName),
      payerDocument: String(body.payerDocument).replace(/\D/g, '')
    };

    console.log('Propix request:', { payload, clientId: PROPIX_CLIENT_ID ? 'presente' : 'ausente' });

    const propixRes = await fetch(`${PROPIX_API_BASE}/api/v1/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': PROPIX_CLIENT_ID,
        'x-client-secret': PROPIX_CLIENT_SECRET
      },
      body: JSON.stringify(payload)
    });

    const data = await propixRes.json().catch(() => ({}));
    
    console.log('Propix response:', { status: propixRes.status, ok: propixRes.ok, data });

    if (!propixRes.ok) {
      console.error('Propix deposito erro:', propixRes.status, data);
      return res.status(propixRes.status || 500).json({ 
        error: 'Falha ao gerar PIX', 
        detail: data,
        statusCode: propixRes.status 
      });
    }

    // Valida resposta mínima
    if (!data.copyPaste && !data.qrcodeUrl) {
      console.error('Propix resposta sem QR code:', data);
      return res.status(500).json({ 
        error: 'Resposta da Propix incompleta (sem código PIX)',
        detail: data 
      });
    }

    // Devolve ao browser SOMENTE o necessário — nunca as credenciais
    return res.status(200).json({
      success: true,
      transactionId: data.transactionId || null,
      qrCodeText: data.copyPaste || null,
      qrCodeBase64: data.qrcodeUrl || null,
      status: data.status || 'PENDENTE'
    });
  } catch (err) {
    console.error('propix-deposito error:', err);
    return res.status(500).json({ error: err.message });
  }
};
