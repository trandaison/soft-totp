import { startQRCapture } from './qr-capture';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SCAN_QR') {
    startQRCapture();
  }
});
