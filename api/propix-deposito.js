// Vercel Serverless Function — Propix: criar depósito PIX
// POST /api/propix-deposito
// Body: { amount, description, payerName, payerDocument }
//
// Usa proxy Deno Deploy (IP fixo) para contornar whitelist da Propix

const DENO_PROXY_URL = 'https://sandy-lark-2659.prazinhogfx18-a11y.deno.net';

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

    // Monta payload
    const payload = {
      amount: amount,
      description: body.description || 'Pagamento',
      payerName: String(body.payerName),
      payerDocument: String(body.payerDocument).replace(/\D/g, '')
    };

    console.log('Propix request via Deno proxy:', { payload });

    const proxyRes = await fetch(`${DENO_PROXY_URL}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await proxyRes.json().catch(() => ({}));
    
    console.log('Propix response:', { 
      status: proxyRes.status, 
      ok: proxyRes.ok, 
      statusText: proxyRes.statusText,
      data 
    });

    if (!proxyRes.ok) {
      console.error('Propix deposito erro:', proxyRes.status, data);
      return res.status(proxyRes.status || 500).json({ 
        error: 'Falha ao gerar PIX', 
        detail: data,
        statusCode: proxyRes.status,
        message: data.message || data.error || 'Erro desconhecido da Propix'
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

    // Devolve ao browser
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
