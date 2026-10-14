// Vercel Serverless Function — GladePay: consultar status
// GET /api/gladepay-status?txId=...
//
// GladePay: sem whitelist de IP, funciona direto com serverless

const GLADEPAY_API_BASE = 'https://app.gladepay.com.br/v1';
const GLADEPAY_API_KEY = (process.env.GLADEPAY_API_KEY || 'gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp').trim();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const txId = req.query.txId || req.query.transactionId;
    
    if (!txId) {
      return res.status(400).json({ error: 'txId required' });
    }

    console.log('GladePay status check:', { txId });

    const gladeRes = await fetch(
      `${GLADEPAY_API_BASE}/deposito/status?txId=${encodeURIComponent(txId)}`,
      { headers: { 'Authorization': `Bearer ${GLADEPAY_API_KEY}` } }
    );

    const data = await gladeRes.json().catch(() => ({}));
    
    console.log('GladePay status response:', { status: gladeRes.status, ok: gladeRes.ok, data });

    if (!gladeRes.ok) {
      console.error('GladePay status erro:', gladeRes.status, data);
      return res.status(gladeRes.status || 500).json({ 
        error: 'Falha ao consultar status', 
        detail: data
      });
    }

    return res.status(200).json({ 
      status: data.status || null
    });
  } catch (err) {
    console.error('gladepay-status error:', err);
    return res.status(500).json({ error: err.message });
  }
};
