# ⚙️ Como Configurar Variável de Ambiente no Vercel

## Por que isso é importante?

Atualmente, a chave GladePay está **hardcoded** no código como fallback:
```javascript
const GLADEPAY_API_KEY = process.env.GLADEPAY_API_KEY || 'gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp';
```

Isso significa:
- ✅ Funciona, mas a chave fica exposta no GitHub
- ⚠️ Qualquer pessoa com acesso ao repo pode ver a chave
- 🔒 **MELHOR PRÁTICA**: configurar como variável de ambiente

## 🚀 Passo a Passo para Configurar

### 1. Acesse o Projeto no Vercel

https://vercel.com/prazinhogfx15-5958s-projects/consulta-valoresareceber-hoje

### 2. Vá em Settings → Environment Variables

1. No menu lateral, clique em **"Settings"**
2. Role até encontrar **"Environment Variables"**
3. Clique em **"Add New"** ou **"Add"**

### 3. Adicione a Variável

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Key** | `GLADEPAY_API_KEY` |
| **Value** | `gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp` |
| **Environments** | ✅ Production<br>✅ Preview<br>✅ Development |

**IMPORTANTE**: Marque **TODOS os ambientes** (Production, Preview, Development)

### 4. Clique em "Save"

### 5. Redeploy o Projeto

Após adicionar a variável:

**Opção A - Automático (recomendado):**
1. Vá em **"Deployments"**
2. Clique nos **três pontinhos** do último deploy
3. Clique em **"Redeploy"**

**Opção B - Via Git:**
1. Faça qualquer commit no GitHub
2. Vercel detecta automaticamente e redeploy

**Opção C - Forçar:**
```bash
# Fazer um commit vazio para forçar deploy
git commit --allow-empty -m "Trigger redeploy with env var"
git push
```

### 6. Verifique se Funcionou

Após o redeploy (2-3 minutos):

1. Acesse: https://consulta-valoresareceber-hoje.vercel.app/test-gladepay.html
2. Clique em **"🔍 1. DIAGNÓSTICO COMPLETO"**
3. Verifique a seção **"Configuração da Chave"**:
   ```json
   {
     "envVarSet": true,  ← DEVE SER true
     "keyPrefix": "gp_live_1FvWAr7Hz8k...",
     "keyLength": 48
   }
   ```

Se `envVarSet: true`, a variável foi configurada com sucesso! ✅

## 🔒 Benefícios de Usar Environment Variables

1. **Segurança**: Chave não fica exposta no GitHub
2. **Flexibilidade**: Pode trocar chave sem alterar código
3. **Múltiplos Ambientes**: Chaves diferentes para produção/teste
4. **Rollback Fácil**: Troca chave sem commit/deploy

## 🧹 Limpeza (Opcional - Após Configurar)

Depois que a variável estiver configurada e funcionando, você pode remover o fallback hardcoded:

```javascript
// ANTES (fallback inseguro)
const GLADEPAY_API_KEY = process.env.GLADEPAY_API_KEY || 'gp_live_1FvWAr7Hz8kvIFePYG5d0zJcFauRanKp';

// DEPOIS (apenas env var)
const GLADEPAY_API_KEY = process.env.GLADEPAY_API_KEY;

if (!GLADEPAY_API_KEY) {
  return res.status(500).json({ 
    error: 'Configuração inválida: GLADEPAY_API_KEY não definida' 
  });
}
```

**Mas isso não é urgente!** Primeiro resolva o erro 403, depois podemos limpar.

---

**Última atualização**: 2026-10-13
**Arquivo relacionado**: `TROUBLESHOOTING-GLADEPAY.md`
