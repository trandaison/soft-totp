import { matchURL } from '../lib/url-match';
import { getAccounts, getPinConfig, savePinConfig, deletePinConfig } from '../lib/storage';
import { derivePinHash, verifyPin, generateSalt } from '../lib/pin';
import { verifyAssertion } from '../lib/webauthn';
import type { Message, PinConfig } from '../lib/types';

async function fetchFaviconAsBase64(domain: string): Promise<string | undefined> {
  try {
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab.url) return;

  const accounts = await getAccounts();
  const matchedAccounts = accounts.filter(
    (a) => a.urlPatterns?.some((pattern) => matchURL(pattern, tab.url!))
  );

  if (matchedAccounts.length === 0) return;

  const pinConfig = await getPinConfig();
  const pinSetup = pinConfig?.isSetup ?? false;

  chrome.tabs.sendMessage(details.tabId, {
    action: 'AUTOFILL',
    payload: { accounts: matchedAccounts, pinSetup },
  });
});

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.action === 'GET_PIN_CONFIG') {
      getPinConfig().then((config) => {
        sendResponse({ config: config ? { isSetup: config.isSetup, credentialId: config.webAuthnCredential?.credentialId } : null });
      });
      return true;
    }

    if (message.action === 'SETUP_PIN') {
      const { pin, credential } = message.payload as { pin: string; credential: { credentialId: string; publicKey: string; transports?: string[] } };

      (async () => {
        try {
          const salt = generateSalt();
          const pinHash = await derivePinHash(pin, salt, 100000);

          const config: PinConfig = {
            pinHash,
            salt: btoa(String.fromCharCode(...salt)),
            iterations: 100000,
            webAuthnCredential: credential,
            isSetup: true,
          };

          await savePinConfig(config);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();

      return true;
    }

    if (message.action === 'VERIFY_PIN') {
      const { pin } = message.payload as { pin: string };

      (async () => {
        try {
          const config = await getPinConfig();
          if (!config || !config.isSetup) {
            sendResponse({ success: false, error: 'PIN not configured' });
            return;
          }

          const salt = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
          const isValid = await verifyPin(pin, config.pinHash, salt, config.iterations);
          sendResponse({ success: isValid });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();

      return true;
    }

    if (message.action === 'RESET_PIN') {
      const { oldPin, newPin, assertion } = message.payload as {
        oldPin: string;
        newPin: string;
        assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string };
      };

      (async () => {
        try {
          const config = await getPinConfig();
          if (!config || !config.isSetup) {
            sendResponse({ success: false, error: 'PIN not configured' });
            return;
          }

          const salt = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
          const isOldPinValid = await verifyPin(oldPin, config.pinHash, salt, config.iterations);
          if (!isOldPinValid) {
            sendResponse({ success: false, error: 'Old PIN is incorrect' });
            return;
          }

          if (!config.webAuthnCredential || config.webAuthnCredential.credentialId !== assertion.credentialId) {
            sendResponse({ success: false, error: 'WebAuthn credential mismatch' });
            return;
          }

          const isValidAssertion = await verifyAssertion(assertion, config.webAuthnCredential.publicKey);
          if (!isValidAssertion) {
            sendResponse({ success: false, error: 'WebAuthn assertion verification failed' });
            return;
          }

          const newSalt = generateSalt();
          const newPinHash = await derivePinHash(newPin, newSalt, 100000);

          const updatedConfig: PinConfig = {
            ...config,
            pinHash: newPinHash,
            salt: btoa(String.fromCharCode(...newSalt)),
          };

          await savePinConfig(updatedConfig);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();

      return true;
    }

    if (message.action === 'REMOVE_PIN') {
      const { pin, assertion } = message.payload as {
        pin: string;
        assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string };
      };

      (async () => {
        try {
          const config = await getPinConfig();
          if (!config || !config.isSetup) {
            sendResponse({ success: false, error: 'PIN not configured' });
            return;
          }

          const salt = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
          const isPinValid = await verifyPin(pin, config.pinHash, salt, config.iterations);
          if (!isPinValid) {
            sendResponse({ success: false, error: 'PIN is incorrect' });
            return;
          }

          if (!config.webAuthnCredential || config.webAuthnCredential.credentialId !== assertion.credentialId) {
            sendResponse({ success: false, error: 'WebAuthn credential mismatch' });
            return;
          }

          const isValidAssertion = await verifyAssertion(assertion, config.webAuthnCredential.publicKey);
          if (!isValidAssertion) {
            sendResponse({ success: false, error: 'WebAuthn assertion verification failed' });
            return;
          }

          await deletePinConfig();
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();

      return true;
    }

    if (message.action === 'SCAN_QR') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'SCAN_QR' });
        }
      });
    }

    if (message.action === 'CAPTURE_TAB') {
      const windowId = sender.tab?.windowId;
      if (windowId == null) {
        sendResponse({ dataUrl: null });
        return;
      }
      chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
        sendResponse({ dataUrl });
      });
      return true;
    }

    if (message.action === 'QR_SCANNED') {
      const payload = message.payload as {
        secret: string;
        issuer: string;
        name: string;
        logoUrl?: string;
      };
      
      const tab = sender.tab;
      const domain = tab?.url ? new URL(tab.url).hostname : undefined;
      
      const issuerDomain = payload.issuer 
        ? payload.issuer.toLowerCase().replace(/[^a-z0-9.-]/g, '') + '.com'
        : undefined;
      
      const faviconPromise = issuerDomain
        ? fetchFaviconAsBase64(issuerDomain).then((url) => 
            url || (domain ? fetchFaviconAsBase64(domain) : undefined)
          )
        : domain 
          ? fetchFaviconAsBase64(domain)
          : Promise.resolve(undefined);
      
      faviconPromise.then((logoUrl) => {
        const enrichedPayload = {
          ...payload,
          logoUrl: payload.logoUrl || logoUrl,
        };
        
        chrome.storage.local.set({ pendingQRScan: enrichedPayload }, () => {
          chrome.action.openPopup();
        });
      });
    }

    if (message.action === 'AUTOFILL_STATUS') {
      chrome.runtime.sendMessage({
        action: 'AUTOFILL_STATUS',
        payload: message.payload,
      });
    }
  }
);
