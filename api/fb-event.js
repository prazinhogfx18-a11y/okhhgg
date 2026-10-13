// Vercel Serverless Function — Facebook Conversions API (server-side)
// POST /api/fb-event
// Body: { event_name, value, currency, email, phone, cpf, client_ip, client_user_agent, event_source_url }

const PIXEL_ID    = '2045608016094458';
const ACCESS_TOKEN = 'EAAf540SIZAxMBStOETTtzQ4LGKW1IoZAKFOk4ujkqWfdZCZCaTAoCusMpRbXfbmEIpn3EofucYJ0hJWVEyRWRoIKwv2KWGSfQcQOxk5FVOYOUHZAdGZCFzB9cyA7EOL1kquXI2AKxJQzUPVrRcZCF4l7YyAZCIVHHuNCyzyNZBtlprneLqJnq4qnoxlDpRpZBSvgZDZD';
const PIXEL_ID_2   = '1446258604180101';
const ACCESS_TOKEN_2 = 'EAAXZCpMkDxC8BSorLdN3l5b0b8l581rLUT3ZC6dHwCDaRAWKjmYrIS2CVvyWmFqF1jUQdTvzaAUSdkulnlHtpJgc0ihYiY9PBZA1iktaXAzUCym1RL6Edr9ZBtOaPZAMcAVTyZAnbHf11fwGHkU1reKM8ySu0MANqQCjMZCxdCXo6tpiriE2PI2PWcozJ22L6JZACgZDZD';
const API_VERSION  = 'v19.0';

// SHA-256 hash sem dependências externas (Node.js nativo)
const { createHash } = require('crypto');
function sha256(value) {
  if (!value) return undefined;
  return createHash('sha256').update(String(value).toLowerCase().trim()).digest('hex');
}

module.exports = async (req, res) => {
  // CORS — permite chamada do browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      event_name        = 'Purchase',
      value             = 0,
      currency          = 'BRL',
      email,
      phone,
      cpf,
      client_ip,
      client_user_agent,
      event_source_url,
      fbc,
      fbp,
      external_id,
      event_id: client_event_id  // event_id enviado pelo cliente para deduplicação
    } = req.body || {};

    const user_data = {
      ...(email    && { em:  sha256(email) }),
      ...(phone    && { ph:  sha256(phone.replace(/\D/g,'')) }),
      ...(cpf      && { external_id: sha256(cpf.replace(/\D/g,'')) }),
      ...(fbc      && { fbc }),
      ...(fbp      && { fbp }),
      client_ip_address:  client_ip         || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      client_user_agent:  client_user_agent || req.headers['user-agent'],
    };

    const event_time = Math.floor(Date.now() / 1000);
    // Usa o event_id do cliente se disponível (deduplicação com pixel client-side)
    const event_id = client_event_id || `${event_name}-${external_id || Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload = {
      data: [{
        event_name,
        event_time,
        event_id,
        event_source_url: event_source_url || 'https://consulta-valoresareceber-hoje.vercel.app',
        action_source: 'website',
        user_data,
        custom_data: {
          value:    parseFloat(value),
          currency: currency.toUpperCase(),
        }
      }]
    };

    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const fbRes = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error('FB CAPI error:', JSON.stringify(fbData));
      return res.status(500).json({ error: 'FB API error', detail: fbData });
    }

    // Segundo pixel — dispara em paralelo, sem bloquear a resposta
    const url2 = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID_2}/events?access_token=${ACCESS_TOKEN_2}`;
    fetch(url2, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    }).catch(err => console.error('FB CAPI pixel2 error:', err));

    return res.status(200).json({ success: true, events_received: fbData.events_received, fbData });

  } catch (err) {
    console.error('fb-event error:', err);
    return res.status(500).json({ error: err.message });
  }
};
