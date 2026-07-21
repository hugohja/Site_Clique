/**
 * Redimensiona/comprime imagens NO NAVEGADOR antes do upload.
 *
 * Motivo: funções serverless (Vercel) limitam o corpo da requisição (~4,5 MB).
 * Fotos de celular têm vários MB cada — várias delas juntas estouram o limite e
 * o envio falha ("Falha de conexão"). Reduzir aqui resolve isso e ainda deixa o
 * app mais leve. Roda só no cliente (usa canvas do navegador).
 *
 * Respeita a orientação EXIF (fotos de celular deitadas) e achata transparência
 * em branco (PNG → JPEG) pra não virar fundo preto.
 */

export interface ResizeOptions {
  /** Maior lado da imagem final, em px. */
  maxDim?: number;
  /** Qualidade do JPEG (0–1). */
  quality?: number;
}

export async function resizeImage(file: File, opts: ResizeOptions = {}): Promise<File> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.82;

  // Só imagens; e se algo der errado, devolve o arquivo original (sem quebrar o envio).
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // Fundo branco antes de desenhar (evita preto onde havia transparência).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    // Se não reduziu (imagem já pequena e sem reescala), mantém o original.
    if (blob.size >= file.size && scale === 1) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
