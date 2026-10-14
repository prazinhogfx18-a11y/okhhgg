// Vercel Serverless Function — consulta o status de um depósito GladePay.
// GET /api/gladepay-status?txId=...

const GLADEPAY_API_BASE = 'https://app.gladepay.com.br/v1';
const REQUEST_TIMEOUT_MS = 15000;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' }
  });

  const apiKey = String(process.env.GLADEPAY_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({
      error: {
        code: 'GLADEPAY_NOT_CONFIGURED',
        message: 'A integração de pagamento não está configurada.'
      }
    });
  }

  const txId = typeof req.query.txId === 'string' ? req.query.txId.trim() : '';
  if (!txId) {
    return res.status(400).json({
      error: { code: 'TX_ID_REQUIRED', message: 'txId é obrigatório.' }
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const gladeResponse = await fetch(
      `${GLADEPAY_API_BASE}/deposito/status?txId=${encodeURIComponent(txId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal
      }
    );
    const text = await gladeResponse.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text.slice(0, 500) };
      }
    }

    if (!gladeResponse.ok) {
      console.error('GladePay recusou a consulta de status.', {
        txId,
        providerStatus: gladeResponse.status,
        providerResponse: data
      });
      const providerMessage = typeof data.message === 'string'
        ? data.message
        : (typeof data.error === 'string'
            ? data.error
            : data.error && typeof data.error.message === 'string'
              ? data.error.message
              : 'A GladePay recusou a consulta de status.');
      return res.status(gladeResponse.status).json({
        error: {
          code: 'GLADEPAY_STATUS_FAILED',
          message: providerMessage,
          providerStatus: gladeResponse.status
        }
      });
    }

    if (typeof data.status !== 'string') {
      return res.status(502).json({
        error: {
          code: 'INVALID_GLADEPAY_RESPONSE',
          message: 'A GladePay respondeu sem o campo status.'
        }
      });
    }

    return res.status(200).json({ status: data.status });
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    console.error('Falha de comunicação ao consultar a GladePay.', {
      txId,
      name: error && error.name,
      message: error && error.message
    });
    return res.status(502).json({
      error: {
        code: timedOut ? 'GLADEPAY_TIMEOUT' : 'GLADEPAY_UNAVAILABLE',
        message: timedOut ? 'A GladePay demorou para responder.' : 'Não foi possível consultar a GladePay.'
      }
    });
  } finally {
    clearTimeout(timeout);
  }
};
