import jsQR from 'jsqr';
import type { QRScanResult } from './types';
import { parseOTPAuthURI } from './totp';

export function decodeQR(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data || null;
}

function cropImageData(
  imageData: ImageData,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d')!;
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = imageData.width;
  tmpCanvas.height = imageData.height;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  tmpCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(tmpCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return ctx.getImageData(0, 0, sw, sh);
}

export function decodeQRMultiscale(imageData: ImageData): string | null {
  const w = imageData.width;
  const h = imageData.height;
  const minDim = Math.min(w, h);

  const result = decodeQR(imageData);
  if (result) return result;

  const scales = [0.75, 0.5, 0.33];
  for (const scale of scales) {
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    const cx = Math.round((w - cw) / 2);
    const cy = Math.round((h - ch) / 2);
    const cropped = cropImageData(imageData, cx, cy, cw, ch);
    const r = decodeQR(cropped);
    if (r) return r;
  }

  if (minDim > 300) {
    const tileSize = Math.round(minDim * 0.6);
    const step = Math.round(tileSize * 0.4);
    for (let y = 0; y + tileSize <= h; y += step) {
      for (let x = 0; x + tileSize <= w; x += step) {
        const tile = cropImageData(imageData, x, y, tileSize, tileSize);
        const r = decodeQR(tile);
        if (r) return r;
      }
    }
  }

  return null;
}

export function decodeQRFromDataURL(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(decodeQR(imageData));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function parseQRContent(content: string): QRScanResult | null {
  if (content.startsWith('otpauth://totp/')) {
    try {
      return parseOTPAuthURI(content);
    } catch {
      return null;
    }
  }
  return null;
}
