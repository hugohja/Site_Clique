# Clica

Marketplace web que conecta fotógrafos e filmmakers freelancers a quem precisa
contratar cobertura de evento. Fase atual: protótipo funcional para validação —
busca com filtros, perfil com portfólio e cadastro de profissional, contato via
WhatsApp. Sem login, sem pagamento (ainda).

Mercado inicial: Rio de Janeiro, Niterói, Goiânia e Anápolis.

## Rodando

```bash
npm install
npm run dev        # http://localhost:3000
```

Build de produção:

```bash
npm run build
npm start
```

## Stack

- **Next.js 15 (App Router) + TypeScript + React 19** — páginas renderizadas no
  servidor, sem biblioteca de UI externa.
- **CSS puro** em `app/globals.css` com a identidade visual (café escuro, âmbar,
  serifada editorial, dados em mono estilo EXIF, furos de rolo de filme nos cards).
- **PWA**: `public/manifest.webmanifest` + `public/sw.js` + ícones. Dá pra
  adicionar à tela inicial do celular e abrir em tela cheia.

## Arquitetura da camada de dados (importante pra fase 2)

A UI e as API routes **nunca tocam os dados diretamente** — tudo passa pela
interface `ProfessionalRepository`:

```
lib/types.ts            → tipos do domínio (Professional, Booking p/ fase 3, constantes)
lib/data/repository.ts  → contrato ProfessionalRepository (list / getById / create)
lib/data/memory.ts      → implementação em memória (fase atual)
lib/data/seed.ts        → dados de demonstração (vira script de seed do banco)
lib/data/index.ts       → ponto ÚNICO de troca da implementação
```

**Para plugar Supabase/Postgres na fase 2:** crie `lib/data/supabase.ts`
implementando `ProfessionalRepository` e troque uma linha em
`lib/data/index.ts`. Páginas, componentes e API routes não mudam.

Observação da fase atual: cadastros feitos pelo formulário vivem em memória —
existem enquanto o processo do servidor viver e somem no restart. É o
comportamento esperado do protótipo.

### Já previsto para as fases seguintes

- `priceFrom` no perfil (base do cálculo de comissão).
- Tipo `Booking` em `lib/types.ts` com `status` (`aberta`/`fechada`/`cancelada`),
  `agreedPrice` e `commissionRate` — estrutura pronta pro split de pagamento da
  fase 3, sem nenhuma UI ainda.
- Portfólio modelado como lista de itens (`PortfolioItem`); na fase 2 os
  placeholders viram URLs de upload sem mudar o shape.

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | Busca com filtros (cidade, tipo de evento, foto/vídeo) + cards de resultado |
| `/profissional/[id]` | Perfil: portfólio, bio, tags, estatísticas, botão de WhatsApp |
| `/cadastro` | Formulário de cadastro — o perfil criado já aparece na busca |
| `GET /api/professionals` | Lista com filtros (`?cidade=&evento=&tipo=`) |
| `POST /api/professionals` | Cria profissional (validação no servidor) |
| `GET /api/professionals/[id]` | Detalhe de um profissional |

## Ícones do PWA

Gerados por `scripts/generate-icons.mjs` (sem dependências). Se mudar a
identidade visual: `node scripts/generate-icons.mjs`.
