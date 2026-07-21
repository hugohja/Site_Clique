# Persistência com Supabase (fase 2)

O Clica funciona em dois modos, sem mudar código:

- **Sem configuração** → store em memória (protótipo/demo). Os dados existem
  enquanto o servidor roda e somem no restart.
- **Com Supabase** → Postgres + Storage. Os dados persistem de verdade.

A troca é automática: se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estiverem
definidos, o app usa o Supabase (ver `lib/data/index.ts`).

## Passo a passo

1. **Crie um projeto** em [supabase.com](https://supabase.com) (plano free serve
   para o piloto).

2. **Rode o schema.** No painel, vá em **SQL Editor**, cole o conteúdo de
   [`supabase/schema.sql`](./schema.sql) e execute. Isso cria as tabelas, os
   índices, liga o RLS e cria os buckets de Storage (`public-media` público e
   `documents` privado).

3. **Pegue as chaves.** Em **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`
     (chave de servidor, acesso total — nunca exponha no cliente nem faça commit)

4. **Configure o ambiente.**
   - Local: copie `.env.example` para `.env.local` e preencha as duas variáveis.
   - Vercel: **Project → Settings → Environment Variables**, adicione as duas.

5. **Suba o app.** Rode `npm run build && npm start` (ou faça deploy na Vercel).
   Novos cadastros, conversas e propostas passam a ser gravados no banco.

## Como os dados ficam organizados

| Tabela | Conteúdo |
| --- | --- |
| `professionals` / `portfolio_items` | perfil público + portfólio |
| `professional_identities` | CPF, documento, gênero — **privado** |
| `clients` / `client_identities` | cliente + identidade **privada** |
| `accounts` / `sessions` | login (hash scrypt) e sessões |
| `conversations` / `messages` | chat e máquina de estados da negociação |

Storage: foto de perfil e portfólio vão para o bucket **público**; a foto do
documento vai para o bucket **privado** `documents` (nunca é exibida — um futuro
painel de moderação usa URL assinada para revisar).

## Segurança

- O RLS fica **ligado sem políticas públicas**: só a `service_role` (usada no
  servidor) enxerga os dados. Se a `anon` key vazar, não lê nada.
- Campos sensíveis (WhatsApp, e-mail, CPF, documento, gênero) nunca saem em
  resposta pública — isso continua garantido na aplicação por
  `toPublicProfessional` / `toPublicClient`.
