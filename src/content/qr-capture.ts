import { createOverlay, showToast } from './overlay';
import { decodeQR, parseQRContent } from '../lib/qr';

async function captureVisibleTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'CAPTURE_TAB' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.dataUrl) {
        resolve(response.dataUrl);
      } else {
        reject(new Error('Failed to capture tab'));
      }
    });
  });
}

function cropImage(
  dataUrl: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(
        img,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );
      resolve(ctx.getImageData(0, 0, rect.width, rect.height));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export async function startQRCapture(): Promise<void> {
  try {
    const { getSelection } = createOverlay();
    const rect = await getSelection();

    const dataUrl = await captureVisibleTab();
    const imageData = await cropImage(dataUrl, rect);
    const qrContent = decodeQR(imageData);

    if (!qrContent) {
      showToast('No QR code found in selection', true);
      return;
    }

    const parsed = parseQRContent(qrContent);
    if (!parsed) {
      showToast('Invalid QR code content', true);
      return;
    }

    chrome.runtime.sendMessage({
      action: 'QR_SCANNED',
      payload: parsed,
    });

    showToast('QR code scanned successfully!');
  } catch (error) {
    if (error instanceof Error && error.message !== 'Cancelled') {
      showToast(`Error: ${error.message}`, true);
    }
  }
}
