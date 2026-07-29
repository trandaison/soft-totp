import { startQRCapture } from './qr-capture';
import { handleAutofill } from './autofill';
import { showPinPopup } from './pin-popup';
import type { Account } from '../lib/types';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SCAN_QR') {
    startQRCapture();
  }

  if (message.action === 'AUTOFILL') {
    const accounts = message.payload?.accounts as Account[];
    const pinSetup = message.payload?.pinSetup as boolean;

    if (!accounts || accounts.length === 0) return;

    if (pinSetup) {
      showPinPopup(
        accounts,
        (selectedAccount) => {
          handleAutofill([selectedAccount]);
        },
        () => {
          // User dismissed popup — do nothing
        }
      );
    } else {
      handleAutofill(accounts);
    }
  }
});
