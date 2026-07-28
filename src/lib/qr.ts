import jsQR from 'jsqr';
import type { QRScanResult } from './types';
import { parseOTPAuthURI } from './totp';

export function decodeQR(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data || null;
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
