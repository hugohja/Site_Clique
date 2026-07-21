import { randomUUID } from "node:crypto";
import { MAX_IMAGE_BYTES } from "@/lib/upload";
import {
  DOCUMENTS_BUCKET,
  PUBLIC_BUCKET,
  isSupabaseConfigured,
  sbPublicUrl,
  sbUpload,
} from "@/lib/supabase";

/**
 * Guarda uma imagem enviada e devolve a referência que fica no banco.
 *
 * - Com Supabase configurado: sobe pro Storage.
 *     • profile / portfolio → bucket público → devolve URL pública.
 *     • document            → bucket privado → devolve o caminho do objeto
 *       (nunca é exibido publicamente; um painel de moderação futuro usa URL
 *       assinada via sbSignedUrl).
 * - Sem Supabase (protótipo): devolve data URL em memória, como antes.
 *
 * Mesma assinatura de retorno de imageToDataUrl, então as rotas trocam a
 * chamada sem mais nenhuma mudança.
 */

export type ImageKind = "profile" | "portfolio" | "document";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
};

export async function storeImage(
  file: File,
  kind: ImageKind
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: `"${file.name || "arquivo"}" não é uma imagem.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `"${file.name || "arquivo"}" passa de 5 MB.` };
  }

  // Protótipo sem banco: mantém o comportamento antigo (data URL em memória).
  if (!isSupabaseConfigured()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return { url: `data:${file.type};base64,${buffer.toString("base64")}` };
  }

  const ext = EXT[file.type] ?? "bin";
  const path = `${kind}/${randomUUID()}.${ext}`;
  const bucket = kind === "document" ? DOCUMENTS_BUCKET : PUBLIC_BUCKET;

  const up = await sbUpload(bucket, path, file);
  if ("error" in up) return { error: up.error };

  // Documento fica em bucket privado: guardamos só o caminho do objeto.
  if (kind === "document") return { url: up.path };
  return { url: sbPublicUrl(bucket, up.path) };
}
