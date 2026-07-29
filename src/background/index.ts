import { matchURL } from '../lib/url-match';
import { getAccounts, getPinConfig, savePinConfig, deletePinConfig, getUnlockState, saveUnlockState } from '../lib/storage';
import { derivePinHash, verifyPin, generateSalt } from '../lib/pin';
import { verifyAssertion } from '../lib/webauthn';
import { fetchAutofillRules, getMfaSelector, getCachedRules } from '../lib/autofill-rules';
import type { Message, PinConfig } from '../lib/types';

fetchAutofillRules();

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

  // First: match by account urlPatterns
  let matchedAccounts = accounts
    .filter((a) => a.urlPatterns?.some((pattern) => matchURL(pattern, tab.url!)))
    .map((account) => {
      if (account.mfaInputSelector) return account;
      const predefinedSelector = getMfaSelector(tab.url!);
      if (predefinedSelector) {
        return { ...account, mfaInputSelector: predefinedSelector };
      }
      return account;
    });

  // Second: if no match, try predefined rules + issuer/domain matching
  if (matchedAccounts.length === 0) {
    const predefinedSelector = getMfaSelector(tab.url!);
    if (predefinedSelector) {
      const hostname = new URL(tab.url!).hostname;
      const domain = hostname.replace(/^(www|accounts|apps|auth|login|signin|sso)\./, '');
      matchedAccounts = accounts
        .filter((a) => {
          if (!a.issuer) return false;
          const issuerDomain = a.issuer.toLowerCase().replace(/\s+/g, '');
          return domain.includes(issuerDomain) || issuerDomain.includes(domain.split('.')[0]);
        })
        .map((account) => ({ ...account, mfaInputSelector: predefinedSelector }));
    }
  }

  if (matchedAccounts.length === 0) return;

  const pinConfig = await getPinConfig();
  const pinSetup = pinConfig?.isSetup ?? false;

  const message = {
    action: 'AUTOFILL',
    payload: { accounts: matchedAccounts, pinSetup },
  };

  // Retry up to 5 times with 200ms delay — content script may not be ready on F5 refresh
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await chrome.tabs.sendMessage(details.tabId, message);
      return;
    } catch {
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
});

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.action === 'GET_PIN_CONFIG') {
      getPinConfig().then((config) => {
        sendResponse({ config: config ? { isSetup: config.isSetup, credentialId: config.webAuthnCredential?.credentialId } : null });
      });
      return true;
    }

    if (message.action === 'CHECK_UNLOCK') {
      (async () => {
        try {
          const [pinConfig, unlockState] = await Promise.all([getPinConfig(), getUnlockState()]);
          const pinSetup = pinConfig?.isSetup ?? false;
          const unlocked = pinSetup ? Date.now() < unlockState.unlockedUntil : true;
          sendResponse({ unlocked, pinSetup });
        } catch (error) {
          sendResponse({ unlocked: false, pinSetup: false, error: (error as Error).message });
        }
      })();
      return true;
    }

    if (message.action === 'DO_UNLOCK') {
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
          if (!isValid) {
            sendResponse({ success: false });
            return;
          }
          await saveUnlockState({ unlockedUntil: Infinity });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();
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
          chrome.tabs.sendMessage(tabs[0].id, { action: 'SCAN_QR' }).catch(() => {
            // Content script not ready, ignore
          });
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
      }).catch(() => {
        // No listener for AUTOFILL_STATUS, ignore
      });
    }

    if (message.action === 'GET_AUTOFILL_RULES') {
      sendResponse({ rules: getCachedRules() });
    }

    if (message.action === 'REFRESH_AUTOFILL_RULES') {
      fetchAutofillRules().then(() => {
        sendResponse({ rules: getCachedRules() });
      });
      return true;
    }
  }
);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(() => {
      saveUnlockState({ unlockedUntil: Date.now() + 10000 }).catch(() => {});
    });
  }
});
