// Vercel Serverless Function — cria uma cobrança Pix na GladePay.
// POST /api/gladepay-deposito

const GLADEPAY_API_BASE = 'https://app.gladepay.com.br/v1';
const REQUEST_TIMEOUT_MS = 15000;

function getApiKey() {
  return String(process.env.GLADEPAY_API_KEY || '').trim();
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

async function fetchGladePay(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${GLADEPAY_API_BASE}${path}`, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function providerMessage(data) {
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (data.error && typeof data.error.message === 'string') return data.error.message;
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({
    ok: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }
  });

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('GLADEPAY_API_KEY não está configurada.');
    return res.status(500).json({
      ok: false,
      error: {
        code: 'GLADEPAY_NOT_CONFIGURED',
        message: 'A integração de pagamento não está configurada.'
      }
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const amountCents = Number(body.amountCents);

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_AMOUNT_CENTS',
        message: 'amountCents deve ser um número inteiro positivo em centavos.'
      }
    });
  }

  const reference = optionalString(body.reference);
  if (!reference) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'REFERENCE_REQUIRED',
        message: 'reference é obrigatória para impedir cobranças duplicadas.'
      }
    });
  }

  const payload = {
    amountCents,
    reference,
    description: optionalString(body.description),
    customerName: optionalString(body.customerName || body.payerName),
    customerEmail: optionalString(body.customerEmail),
    redirectUrl: optionalString(body.redirectUrl)
  };

  if (body.expiresInSeconds !== undefined) {
    const expiresInSeconds = Number(body.expiresInSeconds);
    if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 300 || expiresInSeconds > 3600) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_EXPIRATION',
          message: 'expiresInSeconds deve ser um inteiro entre 300 e 3600.'
        }
      });
    }
    payload.expiresInSeconds = expiresInSeconds;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  try {
    const gladeResponse = await fetchGladePay('/deposito', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await readJson(gladeResponse);

    if (!gladeResponse.ok) {
      const logData = {
        providerStatus: gladeResponse.status,
        reference,
        providerResponse: data
      };

      let account = null;
      if (gladeResponse.status === 403) {
        try {
          const accountResponse = await fetchGladePay('/conta', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          const accountData = await readJson(accountResponse);
          account = accountResponse.ok
            ? accountData
            : { accessible: false, statusCode: accountResponse.status };
          logData.accountCheck = account;
        } catch (accountError) {
          logData.accountCheckError = accountError.message;
        }
      }

      console.error('GladePay recusou a criação do depósito.', logData);

      let message = providerMessage(data) || 'A GladePay recusou a criação da cobrança.';
      if (gladeResponse.status === 403) {
        if (account && account.allowDeposit === false) {
          message = `A conta GladePay está com depósitos desabilitados (status: ${account.status || 'não informado'}, allowDeposit: false).`;
        } else if (account && account.accessible === false) {
          message = `A GladePay recusou a chave inclusive no GET /conta (HTTP ${account.statusCode}). Não é erro de webhook nem do payload do depósito.`;
        } else {
          message = 'A GladePay recusou a operação. A chave ou a conta não possui autorização ativa para depósitos.';
        }
      }

      return res.status(gladeResponse.status).json({
        ok: false,
        error: {
          code: gladeResponse.status === 403 ? 'GLADEPAY_FORBIDDEN' : 'GLADEPAY_REQUEST_FAILED',
          message,
          providerStatus: gladeResponse.status,
          account
        }
      });
    }

    const requiredFieldsPresent = data.ok === true
      && typeof data.txId === 'string'
      && typeof data.publicId === 'string'
      && typeof data.qrCodeText === 'string'
      && data.qrCodeText.length > 0;

    if (!requiredFieldsPresent) {
      console.error('Resposta inválida da GladePay.', { reference, providerResponse: data });
      return res.status(502).json({
        ok: false,
        error: {
          code: 'INVALID_GLADEPAY_RESPONSE',
          message: 'A GladePay não devolveu os campos obrigatórios da cobrança.'
        }
      });
    }

    // Mantém somente o contrato documentado pela GladePay.
    return res.status(200).json({
      ok: data.ok,
      txId: data.txId,
      publicId: data.publicId,
      amountCents: data.amountCents,
      expiresAt: data.expiresAt,
      status: data.status,
      qrCodeText: data.qrCodeText,
      qrCodeBase64: data.qrCodeBase64,
      qrCodeUrl: data.qrCodeUrl,
      splits: data.splits,
      checkoutUrl: data.checkoutUrl
    });
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    console.error('Falha de comunicação com a GladePay.', {
      reference,
      name: error && error.name,
      message: error && error.message
    });
    return res.status(502).json({
      ok: false,
      error: {
        code: timedOut ? 'GLADEPAY_TIMEOUT' : 'GLADEPAY_UNAVAILABLE',
        message: timedOut
          ? 'A GladePay demorou para responder. Tente novamente usando a mesma reference.'
          : 'Não foi possível comunicar com a GladePay.'
      }
    });
  }
};
