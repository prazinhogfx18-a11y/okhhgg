// Cloudflare Worker - Proxy para Propix API
// Deploy em: https://workers.cloudflare.com
//
// Este worker tem IP fixo do Cloudflare e faz proxy das requisições para a Propix,
// resolvendo o problema de whitelist de IP da Vercel (IPs dinâmicos).

const PROPIX_API_BASE = 'https://api.propixbr.com';
const PROPIX_CLIENT_ID = 'live_d4df0cae17af548869dcb5fbbb03a8bb';
const PROPIX_CLIENT_SECRET = 'sk_965ed1149f632f2ce3dd5fa3e24660d4ad6a41bfd04fa0e2292d8c4a44eef840';

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      // POST /deposit - Criar depósito PIX
      if (url.pathname === '/deposit' && request.method === 'POST') {
        const body = await request.json();
        
        const propixRes = await fetch(`${PROPIX_API_BASE}/api/v1/deposit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': PROPIX_CLIENT_ID,
            'x-client-secret': PROPIX_CLIENT_SECRET
          },
          body: JSON.stringify({
            amount: body.amount,
            description: body.description || 'Pagamento',
            payerName: body.payerName,
            payerDocument: body.payerDocument
          })
        });

        const data = await propixRes.json();
        
        return new Response(JSON.stringify(data), {
          status: propixRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /check - Verificar status
      if (url.pathname === '/check' && request.method === 'POST') {
        const body = await request.json();
        
        const propixRes = await fetch(`${PROPIX_API_BASE}/api/v1/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': PROPIX_CLIENT_ID,
            'x-client-secret': PROPIX_CLIENT_SECRET
          },
          body: JSON.stringify({
            transactionId: body.transactionId
          })
        });

        const data = await propixRes.json();
        
        return new Response(JSON.stringify(data), {
          status: propixRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /check - Verificar status via query string
      if (url.pathname === '/check' && request.method === 'GET') {
        const transactionId = url.searchParams.get('transactionId');
        
        if (!transactionId) {
          return new Response(JSON.stringify({ error: 'transactionId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const propixRes = await fetch(`${PROPIX_API_BASE}/api/v1/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': PROPIX_CLIENT_ID,
            'x-client-secret': PROPIX_CLIENT_SECRET
          },
          body: JSON.stringify({ transactionId })
        });

        const data = await propixRes.json();
        
        return new Response(JSON.stringify(data), {
          status: propixRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
