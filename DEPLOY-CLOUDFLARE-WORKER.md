# Deploy do Cloudflare Worker (Proxy Propix)

Este Worker resolve o problema de whitelist de IP da Propix, fornecendo um IP fixo do Cloudflare.

## Passo 1: Criar conta no Cloudflare (gratuito)

1. Acesse: https://dash.cloudflare.com/sign-up
2. Crie uma conta gratuita (não precisa de cartão de crédito)

## Passo 2: Criar o Worker

1. No dashboard, vá em **Workers & Pages**
2. Clique em **Create Application** → **Create Worker**
3. Dê um nome: `propix-proxy` (ou qualquer nome)
4. Clique em **Deploy**

## Passo 3: Colar o código

1. Após criar, clique em **Edit Code**
2. **Delete todo o código de exemplo** que aparece
3. Cole o conteúdo do arquivo `cloudflare-worker-propix.js`
4. Clique em **Save and Deploy**

## Passo 4: Pegar a URL do Worker

Após o deploy, você verá uma URL tipo:
```
https://propix-proxy.SEU-NOME.workers.dev
```

Copie essa URL completa.

## Passo 5: Pegar o IP fixo do Cloudflare

O Worker usa os IPs do Cloudflare (fixos e confiáveis). Para descobrir qual IP será usado:

1. Abra o terminal/cmd
2. Execute: `nslookup propix-proxy.SEU-NOME.workers.dev`
3. Anote os IPs que aparecerem (geralmente começam com `104.`, `172.`, etc.)

**OU** mais simples:

Acesse no navegador:
```
https://propix-proxy.SEU-NOME.workers.dev/check?transactionId=teste
```

A Propix vai retornar erro 403 com o IP. Anote esse IP.

## Passo 6: Adicionar o IP na Propix

1. Entre no painel da Propix
2. Vá em **Configurações → IPs Permitidos**
3. Adicione os IPs do Cloudflare que você descobriu

Os IPs mais comuns do Cloudflare Workers são:
```
104.16.0.0/12
172.64.0.0/13
```

Se a Propix não aceitar ranges, adicione os IPs individuais que apareceram no nslookup.

## Passo 7: Configurar a Vercel para usar o Worker

Depois que o Worker estiver funcionando, me avise e eu atualizo os arquivos da Vercel para apontarem para:
```
https://propix-proxy.SEU-NOME.workers.dev/deposit
https://propix-proxy.SEU-NOME.workers.dev/check
```

## Testando

Após configurar tudo, teste:

```bash
curl -X POST https://propix-proxy.SEU-NOME.workers.dev/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1.00,
    "description": "Teste",
    "payerName": "Teste",
    "payerDocument": "12345678900"
  }'
```

Deve retornar o QR Code PIX se tudo estiver correto.

---

## Alternativa: Deploy via CLI (opcional, se preferir)

```bash
npm install -g wrangler
wrangler login
wrangler init propix-proxy
# Cole o código em src/index.js
wrangler deploy
```
