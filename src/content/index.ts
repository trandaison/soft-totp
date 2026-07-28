import { startQRCapture } from './qr-capture';
import { handleAutofill } from './autofill';
import type { Account } from '../lib/types';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SCAN_QR') {
    startQRCapture();
  }

  if (message.action === 'AUTOFILL') {
    const accounts = message.payload?.accounts as Account[];
    if (accounts && accounts.length > 0) {
      handleAutofill(accounts);
    }
  }
});
