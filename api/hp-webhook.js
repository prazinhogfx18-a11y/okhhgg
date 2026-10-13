// Vercel Serverless Function — GladePay Webhook
// POST /api/hp-webhook
// Recebe callback da GladePay quando o pagamento é confirmado
// Salva o status em memória e responde ao client via polling (GET)

// Armazena pagamentos confirmados em memória (persiste durante a vida do serverless)
// Para produção robusta, usar Vercel KV ou Redis
const paidOrders = new Map();

// Normaliza o status da GladePay para booleano "pago"
function isPaidStatus(status) {
  if (status === true) return true;
  if (typeof status !== 'string') return false;
  const s = status.toUpperCase();
  return s === 'SETTLED' || s === 'PAID';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: client pergunta se pedido foi pago ──────────────────────────────
  if (req.method === 'GET') {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ error: 'order_id required' });
    const paid = paidOrders.has(String(order_id));
    return res.status(200).json({ paid, order_id });
  }

  // ── POST: recebe webhook da GladePay ─────────────────────────────────────
  if (req.method === 'POST') {
    try {
      // Payload GladePay: { event, id (publicId), reference, type, status, amount, refundedAmount }
      const body = req.body || {};
      const publicId  = body.id || body.publicId || body.txId;
      const status    = body.status;
      const reference = body.reference;

      console.log('GladePay webhook:', { publicId, status, reference, event: body.event });

      // Pagamento confirmado
      if (isPaidStatus(status)) {
        if (publicId) {
          paidOrders.set(String(publicId), {
            paid_at: new Date().toISOString(),
            reference
          });
          console.log(`Pedido ${publicId} marcado como PAGO`);
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Webhook error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
