/** Target max encoded size for a data URL stored inside full-profile JSON (server + DB). */
export const SIGNATURE_IMAGE_MAX_DATA_URL_CHARS = 550_000;

/**
 * Downscale and JPEG-compress an image file for embedding as a data URL in the membership profile JSON.
 * @param {File} file
 * @param {{ maxWidth?: number; maxDataUrlChars?: number }} [opts]
 * @returns {Promise<string>} `data:image/jpeg;base64,...`
 */
export async function compressImageFileToJpegDataUrl(file, opts = {}) {
  const maxWidth = opts.maxWidth ?? 960;
  const maxDataUrlChars = opts.maxDataUrlChars ?? SIGNATURE_IMAGE_MAX_DATA_URL_CHARS;

  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, or similar).");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that image. Try JPG or PNG, or a smaller file.");
  }

  try {
    const scale = Math.min(1, maxWidth / Math.max(1, bitmap.width));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image preview.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    let quality = 0.88;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > maxDataUrlChars && quality > 0.42) {
      quality -= 0.07;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    if (dataUrl.length > maxDataUrlChars) {
      throw new Error("Image is still too large after compressing. Try a smaller photo or lower resolution.");
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

/**
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {{ maxWidth?: number; maxDataUrlChars?: number }} [opts]
 * @returns {string} `data:image/jpeg;base64,...`
 */
export function compressCanvasToJpegDataUrl(sourceCanvas, opts = {}) {
  const maxDataUrlChars = opts.maxDataUrlChars ?? SIGNATURE_IMAGE_MAX_DATA_URL_CHARS;
  const maxWidth = opts.maxWidth ?? 960;
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  if (sw < 2 || sh < 2) {
    throw new Error("Signature canvas is too small.");
  }
  const scale = Math.min(1, maxWidth / sw);
  const tw = Math.max(1, Math.round(sw * scale));
  const th = Math.max(1, Math.round(sh * scale));
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not export signature.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tw, th);
  ctx.drawImage(sourceCanvas, 0, 0, tw, th);

  let quality = 0.88;
  let dataUrl = out.toDataURL("image/jpeg", quality);
  while (dataUrl.length > maxDataUrlChars && quality > 0.42) {
    quality -= 0.07;
    dataUrl = out.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > maxDataUrlChars) {
    throw new Error("Drawn signature is too large to save. Clear and try again.");
  }
  return dataUrl;
}

/**
 * True if the canvas looks blank (no meaningful ink).
 * @param {HTMLCanvasElement} canvas
 */
export function canvasHasInk(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const w = canvas.width;
  const h = canvas.height;
  if (w < 2 || h < 2) return false;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const sum = r + g + b;
    if (sum < 680) return true;
  }
  return false;
}
