// Vercel Serverless Function — Propix: consultar status da transação
// POST /api/propix-status
// Body: { transactionId }
//
// Usa proxy Deno Deploy (IP fixo) para contornar whitelist da Propix

const DENO_PROXY_URL = 'https://sandy-lark-2659.prazinhogfx18-a11y.deno.net';

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
    console.log('Propix status check via Deno proxy:', { transactionId });

    const proxyRes = await fetch(`${DENO_PROXY_URL}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId })
    });

    const data = await proxyRes.json().catch(() => ({}));
    
    console.log('Propix status response:', { status: proxyRes.status, ok: proxyRes.ok, data });

    if (!proxyRes.ok) {
      console.error('Propix status erro:', proxyRes.status, data);
      return res.status(proxyRes.status || 500).json({ 
        error: 'Falha ao consultar status', 
        detail: data,
        statusCode: proxyRes.status
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
