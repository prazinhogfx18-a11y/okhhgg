# Deploy automático na Vercel

Projeto Vercel: **consulta-valoresareceber-hoje**
Repositório: **prazinhogfx18-a11y/okhhgg**

Depois de configurado uma vez, **todo push na branch `main` vira um deploy automático** no
mesmo projeto/domínio. Pull requests recebem URLs de preview automáticas.

## 1. Conectar o repositório (configuração única)

1. Abra o projeto na Vercel:
   https://vercel.com/prazinhogfx15-5958s-projects/consulta-valoresareceber-hoje/
2. **Settings → Git → Connect Git Repository** → selecione `prazinhogfx18-a11y/okhhgg`.
3. **Production Branch** = `main`.
4. **Settings → General → Root Directory** = `svr-valores-a-receber-novo`
   (o site fica nesta subpasta do repositório).

## 2. Variáveis de ambiente

**Settings → Environment Variables** → adicione:

| Name               | Value                        | Environments          |
|--------------------|------------------------------|-----------------------|
| `GLADEPAY_API_KEY` | sua chave `gp_live_...`       | Production, Preview   |

O backend (`api/gladepay-deposito.js`, `api/gladepay-status.js`) lê `process.env.GLADEPAY_API_KEY`.
Com a variável configurada, a chave fica fora do código e vem só da Vercel.

> Após adicionar/alterar variáveis, faça um redeploy (ou um novo push) para elas valerem.

## 3. Pronto — fluxo contínuo

```
git push origin main   →   deploy automático em produção (mesmo domínio)
abrir Pull Request      →   deploy de preview com URL própria
```

Nenhum comando de deploy manual é necessário.
