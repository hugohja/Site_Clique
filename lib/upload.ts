/**
 * Conversão de arquivo enviado (multipart) em data URL.
 *
 * Fase atual: imagens viram data URLs guardadas em memória. Fase 2: subir pro
 * storage (Supabase Storage / S3) e guardar só a URL — troca isolada aqui.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function imageToDataUrl(
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: `"${file.name || "arquivo"}" não é uma imagem.` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `"${file.name || "arquivo"}" passa de 5 MB.` };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { url: `data:${file.type};base64,${buffer.toString("base64")}` };
}

export function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
