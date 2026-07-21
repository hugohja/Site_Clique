-- Clica — schema Postgres (fase 2: persistência real).
--
-- Rode este arquivo no SQL Editor do seu projeto Supabase (uma vez).
-- Depois configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do app.
--
-- Segurança: todo acesso acontece no servidor com a service_role key. RLS fica
-- LIGADO em todas as tabelas SEM políticas públicas — assim, mesmo que a anon
-- key vaze, ninguém lê nada. Dados sensíveis (CPF, documento) ficam em tabelas
-- de identidade separadas e o documento vai pra um bucket de Storage privado.

-- ---------- Profissionais ----------
create table if not exists professionals (
  id                  text primary key,
  name                text not null,
  city                text not null,
  type                text not null check (type in ('fotografo','filmmaker','editor')),
  specialties         text[] not null default '{}',
  price_from          integer not null default 0, -- legado: preço agora é por evento (proposta no chat)
  whatsapp            text not null,
  email               text not null,
  payout_pix_key      text, -- chave PIX para repasse (PRIVADA — nunca exposta)
  profile_photo_url   text not null,
  bio                 text not null,
  rating              real not null default 0,
  review_count        integer not null default 0,
  no_show_count       integer not null default 0, -- não comparecimentos confirmados
  response_time_hours real,
  created_at          timestamptz not null default now()
);
-- Banco já existente? rode:
-- alter table professionals add column if not exists no_show_count integer not null default 0;
-- alter table professionals add column if not exists payout_pix_key text;
create index if not exists professionals_city_idx on professionals (city);
create index if not exists professionals_type_idx on professionals (type);
create index if not exists professionals_specialties_idx on professionals using gin (specialties);

create table if not exists portfolio_items (
  id              text primary key,
  professional_id text not null references professionals (id) on delete cascade,
  label           text not null,
  aspect          text not null check (aspect in ('wide','tall','square')),
  focus           text not null default '50% 50%', -- enquadramento (object-position)
  cover           boolean not null default false,
  url             text not null,
  position        integer not null default 0
);
create index if not exists portfolio_items_pro_idx on portfolio_items (professional_id);

-- Se o banco já existe (schema rodado antes), rode este ALTER uma vez:
-- alter table portfolio_items
--   add column if not exists focus text not null default '50% 50%';

-- Identidade do profissional (PRIVADA — CPF, documento).
create table if not exists professional_identities (
  professional_id   text primary key references professionals (id) on delete cascade,
  cpf               text not null,
  document_type     text not null check (document_type in ('rg','cnh','passaporte')),
  document_photo_url text not null,
  gender            text,
  birth_date        date,
  status            text not null default 'em_analise' check (status in ('em_analise','verificado')),
  submitted_at      timestamptz not null default now()
);

-- ---------- Clientes ----------
create table if not exists clients (
  id                text primary key,
  name              text not null,
  city              text,
  whatsapp          text not null,
  email             text not null,
  profile_photo_url text not null,
  created_at        timestamptz not null default now()
);

create table if not exists client_identities (
  client_id         text primary key references clients (id) on delete cascade,
  cpf               text not null,
  document_type     text not null check (document_type in ('rg','cnh','passaporte')),
  document_photo_url text not null,
  gender            text,
  birth_date        date,
  status            text not null default 'em_analise' check (status in ('em_analise','verificado')),
  submitted_at      timestamptz not null default now()
);

-- ---------- Contas (login) ----------
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  role          text not null check (role in ('profissional','cliente')),
  email         text not null unique,
  password_hash text not null,
  professional_id text references professionals (id) on delete set null,
  client_id     text references clients (id) on delete set null,
  -- Consentimento LGPD: registrado automaticamente na criação da conta.
  terms_accepted_at timestamptz not null default now(),
  terms_version text not null default 'v1',
  created_at    timestamptz not null default now()
);

-- Se o banco já existe (schema rodado antes), rode este ALTER uma vez:
-- alter table accounts
--   add column if not exists terms_accepted_at timestamptz not null default now(),
--   add column if not exists terms_version text not null default 'v1';
create index if not exists accounts_email_idx on accounts (lower(email));

create table if not exists sessions (
  token      text primary key,
  account_id uuid not null references accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists sessions_account_idx on sessions (account_id);

-- ---------- Conversas (chat + máquina de estados) ----------
create table if not exists conversations (
  id                   uuid primary key default gen_random_uuid(),
  professional_id      text not null references professionals (id) on delete cascade,
  client_id            text not null references clients (id) on delete cascade,
  client_name          text not null,
  client_whatsapp      text not null,
  event_type           text not null,
  event_date           text not null,
  event_location       text not null,
  status               text not null default 'conversando'
                         check (status in ('conversando','proposta_enviada','proposta_aceita','pagamento_confirmado','contato_liberado','concluido','em_disputa','reembolsado')),
  proposal_amount      integer,
  proposal_proposed_at timestamptz,
  proposal_accepted_at timestamptz,
  agreed_price         integer,
  commission_rate      real not null,
  confirmation_code    text, -- código do evento (custódia); só o cliente vê
  paid_out_at          timestamptz, -- quando o admin marcou o repasse (PIX manual) como feito
  created_at           timestamptz not null default now()
);
-- Banco já existente? rode (atualiza o check de status e adiciona a coluna):
-- alter table conversations drop constraint if exists conversations_status_check;
-- alter table conversations add constraint conversations_status_check
--   check (status in ('conversando','proposta_enviada','proposta_aceita','pagamento_confirmado','contato_liberado','concluido','em_disputa','reembolsado'));
-- alter table conversations add column if not exists confirmation_code text;
-- alter table conversations add column if not exists paid_out_at timestamptz;
create index if not exists conversations_pro_idx on conversations (professional_id);
create index if not exists conversations_client_idx on conversations (client_id);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender          text not null check (sender in ('cliente','profissional','sistema')),
  text            text not null,
  filtered        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- ---------- RLS: ligado, sem política pública ----------
-- A service_role key (usada pelo servidor) ignora RLS. A anon key não passa.
alter table professionals          enable row level security;
alter table portfolio_items        enable row level security;
alter table professional_identities enable row level security;
alter table clients                enable row level security;
alter table client_identities      enable row level security;
alter table accounts               enable row level security;
alter table sessions               enable row level security;
alter table conversations          enable row level security;
alter table messages               enable row level security;

-- ---------- Storage ----------
-- Bucket público (foto de perfil + portfólio) e privado (documentos).
insert into storage.buckets (id, name, public)
  values ('public-media', 'public-media', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;
