// Endpoint de diagnóstico GladePay
// GET /api/gladepay-test - testa conectividade e autenticação

const GLADEPAY_API_BASE = 'https://app.gladepay.com.br/v1';
const GLADEPAY_API_KEY = process.env.GLADEPAY_API_KEY || 'gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = {
    timestamp: new Date().toISOString(),
    keyConfig: {
      envVarSet: !!process.env.GLADEPAY_API_KEY,
      keyPrefix: GLADEPAY_API_KEY ? GLADEPAY_API_KEY.substring(0, 20) + '...' : 'null',
      keyLength: GLADEPAY_API_KEY ? GLADEPAY_API_KEY.length : 0
    },
    tests: []
  };

  // Teste 1: Verificar endpoint de saldo (se existir)
  try {
    const saldoRes = await fetch(`${GLADEPAY_API_BASE}/saldo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GLADEPAY_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    const saldoData = await saldoRes.json().catch(() => null);
    
    results.tests.push({
      name: 'GET /saldo',
      status: saldoRes.status,
      ok: saldoRes.ok,
      statusText: saldoRes.statusText,
      response: saldoData
    });
  } catch (err) {
    results.tests.push({
      name: 'GET /saldo',
      error: err.message
    });
  }

  // Teste 2: Tentar criar um depósito com valor mínimo
  try {
    const depositoRes = await fetch(`${GLADEPAY_API_BASE}/deposito`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLADEPAY_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        amountCents: 100, // R$ 1,00
        description: 'Teste diagnóstico',
        customerName: 'Teste Sistema',
        reference: `diag-${Date.now()}`
      })
    });

    const depositoData = await depositoRes.json().catch(() => null);
    const depositoText = await depositoRes.text().catch(() => '');
    
    results.tests.push({
      name: 'POST /deposito (R$ 1,00)',
      status: depositoRes.status,
      ok: depositoRes.ok,
      statusText: depositoRes.statusText,
      headers: Object.fromEntries(depositoRes.headers.entries()),
      response: depositoData,
      rawText: depositoText.substring(0, 500) // primeiros 500 chars
    });
  } catch (err) {
    results.tests.push({
      name: 'POST /deposito',
      error: err.message
    });
  }

  // Teste 3: Tentar endpoint de listagem (se existir)
  try {
    const listRes = await fetch(`${GLADEPAY_API_BASE}/deposito?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GLADEPAY_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    const listData = await listRes.json().catch(() => null);
    
    results.tests.push({
      name: 'GET /deposito (listar)',
      status: listRes.status,
      ok: listRes.ok,
      response: listData
    });
  } catch (err) {
    results.tests.push({
      name: 'GET /deposito',
      error: err.message
    });
  }

  return res.status(200).json(results);
};
