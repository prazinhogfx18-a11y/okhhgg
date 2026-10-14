// Vercel Serverless Function — Propix: consultar status da transação
// POST /api/propix-status
// Body: { transactionId }
//
// Faz proxy para POST https://api.propixbr.com/api/v1/check
// As credenciais ficam SOMENTE no servidor (nunca expostas ao browser).

const PROPIX_API_BASE = 'https://api.propixbr.com';
const PROPIX_CLIENT_ID = process.env.PROPIX_CLIENT_ID || 'live_d4df0cae17af548869dcb5fbbb03a8bb';
const PROPIX_CLIENT_SECRET = process.env.PROPIX_CLIENT_SECRET || 'sk_965ed1149f632f2ce3dd5fa3e24660d4ad6a41bfd04fa0e2292d8c4a44eef840';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Aceita GET com query string OU POST com body
  let transactionId;
  if (req.method === 'GET') {
    transactionId = req.query.transactionId;
  } else if (req.method === 'POST') {
    transactionId = (req.body || {}).transactionId;
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId required' });
  }

  try {
    console.log('Propix status check:', { transactionId });

    const propixRes = await fetch(`${PROPIX_API_BASE}/api/v1/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': PROPIX_CLIENT_ID,
        'x-client-secret': PROPIX_CLIENT_SECRET
      },
      body: JSON.stringify({ transactionId })
    });

    const data = await propixRes.json().catch(() => ({}));
    
    console.log('Propix status response:', { status: propixRes.status, ok: propixRes.ok, data });

    if (!propixRes.ok) {
      console.error('Propix status erro:', propixRes.status, data);
      return res.status(propixRes.status || 500).json({ 
        error: 'Falha ao consultar status', 
        detail: data,
        statusCode: propixRes.status
      });
    }

    // Retorna o status normalizado
    const transaction = data.transaction || {};
    return res.status(200).json({ 
      status: transaction.transactionState || transaction.status || null,
      transactionId: transaction.transactionId || null,
      value: transaction.value || null
    });
  } catch (err) {
    console.error('propix-status error:', err);
    return res.status(500).json({ error: err.message });
  }
};
