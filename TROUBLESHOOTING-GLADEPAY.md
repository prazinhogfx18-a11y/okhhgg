# 🔧 Troubleshooting GladePay 403 Forbidden

## Status Atual
❌ **Erro**: `POST /api/gladepay-deposito → 403 Forbidden`
- Resposta: `{error: "Falha ao gerar PIX", detail: {}, statusCode: 403}`
- Chave atual: `gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp` (FULL scope)

## 🧪 Passo 1: Execute o Diagnóstico Automático

1. Acesse: https://consulta-valoresareceber-hoje.vercel.app/test-gladepay.html
2. Clique no botão **"🔍 1. DIAGNÓSTICO COMPLETO"**
3. Aguarde os resultados dos 3 testes automáticos
4. Leia a análise no final da página

**O que este diagnóstico faz:**
- ✅ Verifica se a chave está configurada corretamente
- ✅ Testa endpoint `/saldo` (se disponível)
- ✅ Tenta criar um depósito de R$ 1,00
- ✅ Tenta listar depósitos existentes
- ✅ Mostra headers e respostas completas da API

## 🔍 Passo 2: Verifique os Logs do Vercel

1. Acesse: https://vercel.com/prazinhogfx15-5958s-projects/consulta-valoresareceber-hoje/logs
2. Filtre por função: `gladepay-deposito`
3. Procure por logs contendo:
   - `GladePay request:` — payload enviado
   - `GladePay response:` — resposta completa da API
   - Status code, headers, e mensagem de erro detalhada

**Procure especialmente:**
- `keyPresent: "sim"` ou `"não"` → confirma se chave está configurada
- `keyPrefix: "gp_live_..."` → confirma qual chave está sendo usada
- Headers da resposta (podem conter detalhes do erro)

## 🏦 Passo 3: Verifique o Dashboard GladePay

Acesse: https://app.gladepay.com.br/dashboard (ou https://dashboard.gladepay.com.br)

### Checklist no Dashboard:

1. **Status da Conta**
   - [ ] Conta está ATIVA/APROVADA (não bloqueada)
   - [ ] KYC completo (se necessário)
   - [ ] Sem pendências de documentação

2. **API Keys**
   - [ ] Chave `gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp` aparece na lista
   - [ ] Status da chave: **ATIVA** (não revogada/suspensa)
   - [ ] Escopo da chave: **FULL** (não READ_ONLY ou LIMITED)
   - [ ] Ambiente: **PRODUCTION** (não sandbox/test)

3. **Permissões da Chave**
   - [ ] Permissão para criar depósitos PIX
   - [ ] Permissão para leitura
   - [ ] Sem restrições de IP (confirmado: "Nenhum IP restrito")

4. **Histórico de Depósitos**
   - Há algum depósito criado com sucesso antes?
   - Se sim: quando foi o último?
   - Se não: conta pode estar em período de ativação

## 🚨 Possíveis Causas do 403

### 1. Chave API Inválida ou Revogada
**Sintoma**: `detail: {}` vazio
**Solução**: 
- Regenere uma nova chave no dashboard
- Escopo DEVE ser **FULL** (não read-only)
- Copie a chave COMPLETA (começando com `gp_live_`)

### 2. Conta Não Ativada
**Sintoma**: 403 mesmo com chave válida
**Solução**:
- Confirme status da conta no dashboard
- Entre em contato com suporte GladePay
- Pode haver período de aprovação após cadastro

### 3. Ambiente Errado (Sandbox vs Production)
**Sintoma**: Chave `gp_live_` mas conta em modo sandbox
**Solução**:
- Confirme que está usando ambiente de PRODUCTION
- Chaves `gp_test_` são para sandbox, `gp_live_` para produção

### 4. Payload Inválido
**Sintoma**: 400 ou 422 (mas estamos com 403)
**Verificação**: Veja logs do Vercel, seção `GladePay request:`
```json
{
  "amountCents": 2990,
  "description": "Pagamento",
  "customerName": "Nome do Cliente",
  "reference": "ref-123...",
  "callbackUrl": null
}
```

### 5. Limite de Taxa (Rate Limit)
**Sintoma**: 403 ou 429 após muitas requisições
**Solução**: Aguarde 1-5 minutos e teste novamente

### 6. IP Whitelist Oculto
**Sintoma**: API diz "sem restrição" mas continua bloqueando
**Verificação**: 
- Pergunte ao suporte se há whitelist oculto
- Forneça IPs do Vercel (variam, mas incluem 3.239.54.4, 44.195.47.194, 54.158.231.47)

## ✅ Próximas Ações

Após executar os 3 passos acima, reporte aqui:

1. **Resultado do diagnóstico automático** (`/test-gladepay.html`)
   - Status de cada teste
   - Respostas completas da API

2. **Logs do Vercel**
   - keyPresent: ?
   - keyPrefix: ?
   - Status code e headers da resposta

3. **Dashboard GladePay**
   - Status da conta: ?
   - Status da chave: ?
   - Escopo da chave: ?
   - Há depósitos criados antes? (sim/não)

4. **Tentativa Manual** (opcional)
   - Use Postman ou Insomnia
   - POST https://app.gladepay.com.br/v1/deposito
   - Header: `Authorization: Bearer gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp`
   - Body: `{"amountCents": 1000, "description": "Teste manual"}`
   - Resultado: ?

## 🆘 Alternativas se GladePay Não Funcionar

Se após verificar tudo a API continuar retornando 403:

1. **Contatar Suporte GladePay**
   - Pergunte sobre ativação da conta
   - Mencione o erro 403 ao criar depósitos
   - Forneça a chave (últimos 8 caracteres)

2. **Tentar Outra Gateway**
   - Mercado Pago (https://www.mercadopago.com.br/developers)
   - PagSeguro PIX (https://dev.pagseguro.uol.com.br/)
   - Asaas (https://asaas.com/)
   - Stark Bank (https://starkbank.com/)

3. **Usar Fallback Temporário**
   - QR code estático (sem webhook)
   - Link de pagamento manual
   - Aguardar resolução do suporte

---

**Última atualização**: 2026-10-13
**Commit**: 955436d
**Deploy**: https://consulta-valoresareceber-hoje.vercel.app
