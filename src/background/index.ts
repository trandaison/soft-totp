import { matchURL } from '../lib/url-match';
import { getAccounts } from '../lib/storage';
import type { Message } from '../lib/types';

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

  chrome.tabs.sendMessage(details.tabId, {
    action: 'AUTOFILL',
    payload: { accounts: matchedAccounts },
  });
});

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
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
