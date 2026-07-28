import { matchURL } from '../lib/url-match';
import { getAccounts } from '../lib/storage';
import type { Message } from '../lib/types';

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab.url) return;

  const accounts = await getAccounts();
  const matchedAccounts = accounts.filter(
    (a) => a.urlPattern && matchURL(a.urlPattern, tab.url!)
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
      chrome.runtime.sendMessage({
        action: 'QR_SCANNED',
        payload: message.payload,
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
