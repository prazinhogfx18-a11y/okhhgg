# Solução RÁPIDA: Deploy no Deno (2 minutos)

## Por que isso resolve?
- Deno Deploy tem **IP fixo** (diferente da Vercel)
- É **gratuito** e **sem configuração**
- Deploy em **1 clique**

## Passo a passo (2 minutos):

### 1. Criar conta Deno (1 clique com GitHub)
- Acesse: https://dash.deno.com/signin
- Clique em **Sign in with GitHub**
- Autorize

### 2. Criar novo projeto
- No dashboard, clique em **+ New Project**
- Clique em **+ Playground** (canto superior direito)

### 3. Colar o código
- **Delete todo o código de exemplo**
- Abra o arquivo `deno-deploy-proxy.ts` deste repositório
- **Copie TODO o conteúdo**
- **Cole** no editor do Deno
- Clique em **Save & Deploy** (canto superior direito)

### 4. Pegar a URL
Após o deploy, você verá uma URL tipo:
```
https://seu-projeto.deno.dev
```

**COPIE ESSA URL E ME MANDA AQUI**

### 5. Pegar o IP fixo
No terminal/cmd do seu PC, execute:
```bash
nslookup seu-projeto.deno.dev
```

Anote o IP que aparecer.

### 6. Adicionar IP na Propix
- Entre no painel Propix
- Adicione o IP do Deno na whitelist
- **OU peça pra eles desabilitarem o filtro de IP**

### 7. Me manda a URL
Assim que você me mandar a URL do Deno (ex: `https://seu-projeto.deno.dev`), 
eu atualizo a Vercel em 2 minutos para usar esse proxy.

---

## Alternativa ainda mais simples:

**Fale com o suporte da Propix e mande esta mensagem:**

> "Olá, estou usando serverless (Vercel) e os IPs mudam a cada deploy. 
> Por favor, DESABILITEM o filtro de whitelist de IP na minha conta 
> ou adicionem todos os IPs da AWS us-east-1 (arquivo IPS-VERCEL-PARA-WHITELIST.txt)."

Se eles desabilitarem, o site funciona IMEDIATAMENTE sem precisar de proxy.
