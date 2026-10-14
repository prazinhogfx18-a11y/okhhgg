// Vercel Serverless Function — GladePay: criar depósito PIX
// POST /api/gladepay-deposito
// Body: { amountCents, description, payerName, payerDocument, reference }
//
// GladePay: sem whitelist de IP, funciona direto com serverless

const GLADEPAY_API_BASE = 'https://app.gladepay.com.br/v1';
const GLADEPAY_API_KEY = process.env.GLADEPAY_API_KEY || 'gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp';

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
      return res.status(400).json({ error: 'amountCents inválido (deve ser inteiro em centavos)' });
    }

    // Monta payload GladePay conforme documentação oficial
    const payload = {
      amountCents: amountCents,
      description: body.description || 'Pagamento',
      customerName: body.payerName || body.customerName || undefined,
      reference: body.reference || `ref-${Date.now()}`,
      callbackUrl: body.callbackUrl || undefined
    };

    // Remove campos undefined (opcional mas mais limpo)
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    console.log('GladePay request:', { 
      url: `${GLADEPAY_API_BASE}/deposito`,
      payload,
      keyPresent: GLADEPAY_API_KEY && GLADEPAY_API_KEY.length >= 40 ? 'sim' : 'não',
      keyPrefix: GLADEPAY_API_KEY ? GLADEPAY_API_KEY.substring(0, 20) + '...' : 'null',
      keyLength: GLADEPAY_API_KEY ? GLADEPAY_API_KEY.length : 0
    });

    const gladeRes = await fetch(`${GLADEPAY_API_BASE}/deposito`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLADEPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const contentType = gladeRes.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await gladeRes.json().catch(() => ({}));
    } else {
      const text = await gladeRes.text();
      console.error('GladePay resposta não-JSON:', { status: gladeRes.status, text });
      data = { error: 'Resposta não-JSON', rawText: text.substring(0, 500) };
    }
    
    console.log('GladePay response:', { 
      status: gladeRes.status, 
      ok: gladeRes.ok,
      statusText: gladeRes.statusText,
      data,
      headers: Object.fromEntries(gladeRes.headers.entries())
    });

    if (!gladeRes.ok) {
      console.error('GladePay deposito erro:', gladeRes.status, data);
      return res.status(gladeRes.status || 500).json({ 
        error: 'Falha ao gerar PIX', 
        detail: data,
        statusCode: gladeRes.status,
        message: data.message || data.error || 'Erro desconhecido'
      });
    }

    // Valida resposta mínima
    if (!data.qrCodeText) {
      console.error('GladePay resposta sem QR code:', data);
      return res.status(500).json({ 
        error: 'Resposta da GladePay incompleta (sem código PIX)',
        detail: data 
      });
    }

    // Retorna no formato esperado pelo frontend
    return res.status(200).json({
      success: true,
      ok: true,
      transactionId: data.publicId || data.txId,
      publicId: data.publicId,
      txId: data.txId,
      qrCodeText: data.qrCodeText,
      qrCodeBase64: data.qrCodeBase64 || null,
      qrCodeUrl: data.qrCodeUrl || null,
      status: data.status || 'CREATED',
      checkoutUrl: data.checkoutUrl || null,
      expiresAt: data.expiresAt || null
    });
  } catch (err) {
    console.error('gladepay-deposito error:', err);
    return res.status(500).json({ error: err.message });
  }
};
