// Debug endpoint - mostra informações sobre a chave configurada
// GET /api/debug-key

const GLADEPAY_API_KEY = process.env.GLADEPAY_API_KEY || 'gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const info = {
    timestamp: new Date().toISOString(),
    deployId: process.env.VERCEL_DEPLOYMENT_ID || 'local',
    region: process.env.VERCEL_REGION || 'unknown',
    envVarExists: !!process.env.GLADEPAY_API_KEY,
    keyInfo: {
      length: GLADEPAY_API_KEY ? GLADEPAY_API_KEY.length : 0,
      prefix: GLADEPAY_API_KEY ? GLADEPAY_API_KEY.substring(0, 20) : 'null',
      suffix: GLADEPAY_API_KEY ? '...' + GLADEPAY_API_KEY.substring(GLADEPAY_API_KEY.length - 8) : 'null',
      full: GLADEPAY_API_KEY // REMOVER depois do debug
    },
    allEnvVars: Object.keys(process.env).filter(k => k.includes('GLADE') || k.includes('API'))
  };

  return res.status(200).json(info);
};
