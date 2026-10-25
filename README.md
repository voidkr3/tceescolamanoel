# Sistema TCE — Vercel + Neon (sem Git)

## 1. Banco (Neon)
- Abra [neon.tech](https://neon.tech) e crie um projeto
- No **SQL Editor**, cole e rode o `schema.sql`
- Copie a **Pooled connection** (vai parecer `postgresql://...`)

## 2. Vercel
- Abra [vercel.com](https://vercel.com) e entre
- Clique em **Add New...** → **Project**
- Escolha **Other** (não Git, não template)
- Upload manual: coloque todos os arquivos desta pasta
- Configure as variáveis:
  - `DATABASE_URL` = string do Neon
  - `JWT_SECRET` = `openssl rand -hex 32` no terminal
  - `SETUP_KEY` = qualquer chave (ex: `setup-2024`)
- Deploy

## 3. Primeiro acesso
- Abra o site gerado
- **Primeiro acesso** → preencha a SETUP_KEY, seu nome, e-mail e senha
- **Apague a SETUP_KEY** nas variáveis do Vercel depois
