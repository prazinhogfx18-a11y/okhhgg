// Vercel Serverless Function — Webhook universal
// POST /api/hp-webhook
// Compatível com GladePay, Propix e outros
// Salva o status em memória e responde ao client via polling (GET)

// Armazena pagamentos confirmados em memória
const paidOrders = new Map();

// Normaliza o status para booleano "pago"
function isPaidStatus(status) {
  if (status === true) return true;
  if (typeof status !== 'string') return false;
  const s = status.toUpperCase();
  return s === 'SETTLED' || s === 'PAID' || s === 'COMPLETO' || s === 'DEPOSITO_COMPLETO';
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

  // ── POST: recebe webhook (GladePay ou Propix) ────────────────────────────
  if (req.method === 'POST') {
    try {
      // Payload GladePay: { event, id (publicId), reference, type, status, amount, refundedAmount }
      // Payload Propix: { transactionId, status, amount, type }
      const body = req.body || {};
      const txId = body.id || body.publicId || body.txId || body.transactionId;
      const status = body.status || body.transactionState;
      const reference = body.reference || body.description;

      console.log('Webhook recebido:', { txId, status, reference, event: body.event });

      // Pagamento confirmado
      if (isPaidStatus(status)) {
        if (txId) {
          paidOrders.set(String(txId), {
            paid_at: new Date().toISOString(),
            reference
          });
          console.log(`Pedido ${txId} marcado como PAGO`);
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
