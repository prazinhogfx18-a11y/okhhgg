// Vercel Serverless Function — GladePay: status do depósito
// GET /api/gp-status?txId={publicId}
//
// Faz proxy para GET https://app.gladepay.com.br/v1/deposito/status?txId=...
// A chave da GladePay fica SOMENTE no servidor (nunca é exposta ao browser).

const GP_API_BASE = 'https://app.gladepay.com.br/v1';
const GP_API_KEY  = process.env.GLADEPAY_API_KEY || 'gp_live_hmVHJH7GV4eTWqnaxx069vNHPZ3sGjeI';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { txId } = req.query;
    if (!txId) return res.status(400).json({ error: 'txId required' });

    console.log('GladePay status check:', { txId });

    const gpRes = await fetch(
      `${GP_API_BASE}/deposito/status?txId=${encodeURIComponent(txId)}`,
      { headers: { 'Authorization': `Bearer ${GP_API_KEY}` } }
    );

    const data = await gpRes.json().catch(() => ({}));
    
    console.log('GladePay status response:', { status: gpRes.status, ok: gpRes.ok, data });

    if (!gpRes.ok) {
      console.error('GladePay status erro:', gpRes.status, data);
      return res.status(gpRes.status || 500).json({ 
        error: 'Falha ao consultar status', 
        detail: data,
        statusCode: gpRes.status
      });
    }

    return res.status(200).json({ status: data.status || null });
  } catch (err) {
    console.error('gp-status error:', err);
    return res.status(500).json({ error: err.message });
  }
};
