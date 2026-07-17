# Clica

Marketplace web que conecta fotógrafos e filmmakers freelancers a quem precisa
contratar cobertura de evento. Fase atual: protótipo funcional para validação —
busca com filtros, perfil com portfólio, cadastro de profissional e **chat
interno com contato protegido** (anti-desintermediação). Sem login, sem
gateway de pagamento real (ainda).

Mercado inicial: Rio de Janeiro, Niterói, Goiânia e Anápolis.

## Fluxo anti-desintermediação (por que não há WhatsApp no perfil)

A receita da plataforma é comissão sobre o valor fechado. Pra evitar que as
partes fechem por fora, **nenhum contato do profissional aparece em lugar
público** — nem na UI, nem no JSON das APIs públicas (`PublicProfessional`
remove o campo antes de qualquer resposta). O único caminho até o contato:

1. **conversando** — cliente abre o chat pelo perfil (`Iniciar conversa`).
   Contato oculto; o filtro de `lib/moderation.ts` censura no servidor
   telefones, e-mails, @usuários, links e menções a WhatsApp/redes.
2. **pagamento_confirmado** — botão "Simular pagamento" registra o valor
   fechado + comissão vigente (12%, `COMMISSION_RATE`).
3. **contato_liberado** — WhatsApp do profissional e logística do evento
   aparecem pros dois lados no chat.

A transição 2→3 é automática na simulação. Toda a integração de pagamento
futura vive em `lib/payments.ts` (`confirmarPagamento()`): na fase 3, o corpo
dessa função vira a criação da cobrança (PIX/cartão com split) e a liberação
passa a acontecer no webhook do gateway — o resto do fluxo não muda.

**Limitação assumida do protótipo (sem login):** o cliente recebe o link
`/conversa/<uuid>` (id não adivinhável, também guardado no localStorage); o
profissional acessa o mesmo link com `?papel=profissional`. Na fase 2, com
cadastro persistente, cada lado passa a ter sua caixa de entrada autenticada.
O chat não usa websocket nesta fase — polling leve a cada 7s.

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

- `priceFrom` no perfil e `agreedPrice`/`commissionRate` na conversa — base do
  cálculo de comissão e do split da fase 3.
- `Conversation.status` (`conversando`/`pagamento_confirmado`/`contato_liberado`)
  já é a máquina de estados que o gateway real vai dirigir via webhook.
- Portfólio modelado como lista de itens (`PortfolioItem`); na fase 2 os
  placeholders viram URLs de upload sem mudar o shape.

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | Busca com filtros (cidade, tipo de evento, foto/vídeo) + cards de resultado |
| `/profissional/[id]` | Perfil: portfólio, bio, tags, estatísticas, botão "Iniciar conversa" |
| `/profissional/[id]/conversar` | Formulário que abre a conversa (dados do evento + 1ª mensagem) |
| `/conversa/[id]` | Chat interno; `?papel=profissional` para responder como profissional |
| `/cadastro` | Formulário de cadastro — o perfil criado já aparece na busca |
| `GET /api/professionals` | Lista com filtros (`?cidade=&evento=&tipo=`) — sem contato |
| `POST /api/professionals` | Cria profissional (validação no servidor) |
| `GET /api/professionals/[id]` | Detalhe de um profissional — sem contato |
| `POST /api/conversas` | Abre conversa (mensagem inicial já passa pelo filtro) |
| `GET /api/conversas/[id]` | Conversa + mensagens; contato só se `contato_liberado` |
| `POST /api/conversas/[id]/mensagens` | Envia mensagem (filtro anti-contato no servidor) |
| `POST /api/conversas/[id]/pagamento` | Simula pagamento → libera contato |

## Ícones do PWA

Gerados por `scripts/generate-icons.mjs` (sem dependências). Se mudar a
identidade visual: `node scripts/generate-icons.mjs`.
