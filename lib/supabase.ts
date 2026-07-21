/**
 * Cliente Supabase mínimo (sem dependência externa).
 *
 * Fala direto com a API REST do Postgres (PostgREST) e com o Storage via fetch,
 * usando a service role key — todo acesso a dados acontece no servidor (API
 * routes / server components), e as regras de campo público/privado continuam
 * sendo aplicadas na aplicação (toPublicProfessional / toPublicClient).
 *
 * Configuração por variáveis de ambiente:
 *   SUPABASE_URL              ex: https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY chave service_role (NUNCA exposta ao cliente)
 *
 * Sem essas variáveis, isSupabaseConfigured() = false e o app usa o store em
 * memória (protótipo). Assim o mesmo código roda com ou sem banco.
 */

const URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Bucket público (foto de perfil e portfólio) e privado (documentos). */
export const PUBLIC_BUCKET = "public-media";
export const DOCUMENTS_BUCKET = "documents";

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && SERVICE_KEY);
}

function requireConfig(): { url: string; key: string } {
  if (!URL || !SERVICE_KEY) {
    throw new Error("Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return { url: URL, key: SERVICE_KEY };
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const { key } = requireConfig();
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

/** Par de filtro/opção do PostgREST. `raw` mantém o valor sem encode (select/order). */
export type QueryPair = { key: string; value: string; raw?: boolean };

/** Monta a query string do PostgREST encodando só os valores de filtro. */
function buildQuery(pairs: QueryPair[]): string {
  if (pairs.length === 0) return "";
  const parts = pairs.map(({ key, value, raw }) =>
    `${key}=${raw ? value : encodeURIComponent(value)}`
  );
  return `?${parts.join("&")}`;
}

async function rest(
  table: string,
  init: RequestInit,
  pairs: QueryPair[] = []
): Promise<unknown> {
  const { url } = requireConfig();
  const res = await fetch(`${url}/rest/v1/${table}${buildQuery(pairs)}`, {
    ...init,
    headers: { ...headers({ "Content-Type": "application/json" }), ...(init.headers ?? {}) },
    // Dados sempre atuais; nunca cachear respostas de banco.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${table} ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** SELECT. `pairs` recebe select/order/filtros do PostgREST. */
export async function sbSelect<T = unknown>(table: string, pairs: QueryPair[]): Promise<T[]> {
  return (await rest(table, { method: "GET" }, pairs)) as T[];
}

/** INSERT (uma ou várias linhas). Retorna as linhas criadas. */
export async function sbInsert<T = unknown>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[]
): Promise<T[]> {
  return (await rest(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  })) as T[];
}

/** UPDATE das linhas que casam com os filtros. Retorna as linhas alteradas. */
export async function sbUpdate<T = unknown>(
  table: string,
  filters: QueryPair[],
  patch: Record<string, unknown>
): Promise<T[]> {
  return (await rest(
    table,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) },
    filters
  )) as T[];
}

/** DELETE das linhas que casam com os filtros. */
export async function sbDelete(table: string, filters: QueryPair[]): Promise<void> {
  await rest(table, { method: "DELETE" }, filters);
}

/** Codifica cada segmento do caminho, mantendo as barras (o endpoint de sign
 * do Storage não aceita "/" escapado como %2F). */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Sobe um arquivo pro Storage. Retorna o caminho do objeto (bucket-relative). */
export async function sbUpload(
  bucket: string,
  path: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const { url } = requireConfig();
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: "POST",
    headers: headers({ "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" }),
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `Falha ao subir imagem (${res.status}): ${body}` };
  }
  return { path };
}

/** URL pública de um objeto em bucket público. */
export function sbPublicUrl(bucket: string, path: string): string {
  const { url } = requireConfig();
  return `${url}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

/**
 * URL assinada temporária para um objeto de bucket privado (ex: documento).
 * Usada por um futuro painel de moderação — documentos nunca são públicos.
 */
export async function sbSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60
): Promise<string | null> {
  const { url } = requireConfig();
  const res = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encodePath(path)}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { signedURL?: string };
  return data.signedURL ? `${url}/storage/v1${data.signedURL}` : null;
}

/** Atalhos para os operadores mais usados do PostgREST. */
export const q = {
  select: (value: string): QueryPair => ({ key: "select", value, raw: true }),
  order: (value: string): QueryPair => ({ key: "order", value, raw: true }),
  eq: (key: string, value: string): QueryPair => ({ key, value: `eq.${value}` }),
  /** Array contém o valor (specialties). */
  contains: (key: string, value: string): QueryPair => ({
    key,
    value: `cs.{${JSON.stringify(value)}}`,
  }),
  limit: (n: number): QueryPair => ({ key: "limit", value: String(n), raw: true }),
};
