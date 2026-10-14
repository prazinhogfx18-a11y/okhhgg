// Deno Deploy Proxy para Propix
// Deploy: https://dash.deno.com/new
// 
// Cole este código, clique em Deploy, pegue a URL e me manda

const PROPIX_API_BASE = 'https://api.propixbr.com';
const PROPIX_CLIENT_ID = 'live_d4df0cae17af548869dcb5fbbb03a8bb';
const PROPIX_CLIENT_SECRET = 'sk_965ed1149f632f2ce3dd5fa3e24660d4ad6a41bfd04fa0e2292d8c4a44eef840';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);

  try {
    // POST /deposit
    if (url.pathname === '/deposit' && req.method === 'POST') {
      const body = await req.json();
      
      const res = await fetch(`${PROPIX_API_BASE}/api/v1/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': PROPIX_CLIENT_ID,
          'x-client-secret': PROPIX_CLIENT_SECRET,
        },
        body: JSON.stringify({
          amount: body.amount,
          description: body.description || 'Pagamento',
          payerName: body.payerName,
          payerDocument: body.payerDocument,
        }),
      });

      const data = await res.json();
      
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // POST /check
    if (url.pathname === '/check' && req.method === 'POST') {
      const body = await req.json();
      
      const res = await fetch(`${PROPIX_API_BASE}/api/v1/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': PROPIX_CLIENT_ID,
          'x-client-secret': PROPIX_CLIENT_SECRET,
        },
        body: JSON.stringify({
          transactionId: body.transactionId,
        }),
      });

      const data = await res.json();
      
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // GET /check
    if (url.pathname === '/check' && req.method === 'GET') {
      const transactionId = url.searchParams.get('transactionId');
      
      const res = await fetch(`${PROPIX_API_BASE}/api/v1/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': PROPIX_CLIENT_ID,
          'x-client-secret': PROPIX_CLIENT_SECRET,
        },
        body: JSON.stringify({ transactionId }),
      });

      const data = await res.json();
      
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
