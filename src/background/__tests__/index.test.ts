import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Account } from '../../lib/types';

const mockSendMessage = vi.fn();
const mockTabsGet = vi.fn();
const mockTabsQuery = vi.fn();
const mockCaptureVisibleTab = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockGetAccounts = vi.fn();
const mockGetPinConfig = vi.fn();
const mockMatchURL = vi.fn();
const mockGenerateCode = vi.fn();
const mockStorageLocalSet = vi.fn();
const mockOpenPopup = vi.fn();
const mockFetch = vi.fn();
const mockFetchAutofillRules = vi.fn().mockResolvedValue(undefined);
const mockGetMfaSelector = vi.fn().mockReturnValue(null);

vi.mock('../../lib/storage', () => ({
  getAccounts: mockGetAccounts,
  getPinConfig: mockGetPinConfig,
}));

vi.mock('../../lib/url-match', () => ({
  matchURL: mockMatchURL,
}));

vi.mock('../../lib/totp', () => ({
  generateCode: mockGenerateCode,
}));

vi.mock('../../lib/autofill-rules', () => ({
  fetchAutofillRules: mockFetchAutofillRules,
  getMfaSelector: mockGetMfaSelector,
}));

const webNavigationListeners: Array<(details: { frameId: number; tabId: number }) => void> = [];
const runtimeMessageListeners: Array<(message: { action: string; payload?: unknown }, sender: { tab?: { windowId?: number; url?: string } }, sendResponse: (response: unknown) => void) => boolean | void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  webNavigationListeners.length = 0;
  runtimeMessageListeners.length = 0;

  vi.stubGlobal('chrome', {
    webNavigation: {
      onCompleted: {
        addListener: vi.fn((listener: (details: { frameId: number; tabId: number }) => void) => {
          webNavigationListeners.push(listener);
        }),
      },
    },
    tabs: {
      get: mockTabsGet,
      query: mockTabsQuery.mockImplementation((query: unknown, callback: (tabs: Array<{ id?: number }>) => void) => {
        callback([]);
      }),
      sendMessage: mockTabsSendMessage,
      captureVisibleTab: mockCaptureVisibleTab,
    },
    runtime: {
      onMessage: {
        addListener: vi.fn((listener: (message: { action: string; payload?: unknown }, sender: { tab?: { windowId?: number; url?: string } }, sendResponse: (response: unknown) => void) => boolean | void) => {
          runtimeMessageListeners.push(listener);
        }),
      },
      sendMessage: mockSendMessage,
    },
    storage: {
      local: {
        set: mockStorageLocalSet.mockImplementation((data: unknown, callback?: () => void) => {
          callback?.();
        }),
      },
    },
    action: {
      openPopup: mockOpenPopup,
    },
  } as unknown as typeof chrome);

  vi.stubGlobal('fetch', mockFetch.mockRejectedValue(new Error('Network error')));

  vi.resetModules();
});

describe('background script', () => {
  it('should register webNavigation.onCompleted listener', async () => {
    await import('../index');
    expect(chrome.webNavigation.onCompleted.addListener).toHaveBeenCalledOnce();
  });

  it('should register runtime.onMessage listener', async () => {
    await import('../index');
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledOnce();
  });

  it('should call fetchAutofillRules on startup', async () => {
    await import('../index');
    expect(mockFetchAutofillRules).toHaveBeenCalledOnce();
  });

  describe('URL matching on navigation', () => {
    it('should skip non-main frames', async () => {
      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 1, tabId: 1 });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should skip if tab has no URL', async () => {
      mockTabsGet.mockResolvedValue({ url: undefined });
      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 0, tabId: 1 });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should send AUTOFILL with matched accounts', async () => {
      const accounts: Account[] = [
        { id: '1', name: 'Test', issuer: 'Test', secret: 'JBSWY3DPEHPK3PXP', urlPatterns: ['github.com'], createdAt: 0, sortOrder: 0 },
        { id: '2', name: 'Other', issuer: 'Other', secret: 'JBSWY3DPEHPK3PXP', urlPatterns: ['gitlab.com'], createdAt: 0, sortOrder: 1 },
      ];

      mockTabsGet.mockResolvedValue({ url: 'https://github.com/login' });
      mockGetAccounts.mockResolvedValue(accounts);
      mockMatchURL.mockImplementation((pattern: string, url: string) => pattern === 'github.com');
      mockGetPinConfig.mockResolvedValue(null);

      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 0, tabId: 1 });

      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, {
        action: 'AUTOFILL',
        payload: { accounts: [accounts[0]], pinSetup: false },
      });
    });

    it('should apply predefined selector when account has no custom mfaInputSelector', async () => {
      const accounts: Account[] = [
        { id: '1', name: 'Test', issuer: 'Test', secret: 'JBSWY3DPEHPK3PXP', urlPatterns: ['github.com'], createdAt: 0, sortOrder: 0 },
      ];

      mockTabsGet.mockResolvedValue({ url: 'https://github.com/sessions/two-factor' });
      mockGetAccounts.mockResolvedValue(accounts);
      mockMatchURL.mockImplementation((pattern: string, url: string) => pattern === 'github.com');
      mockGetMfaSelector.mockReturnValue("input[name='otp']");
      mockGetPinConfig.mockResolvedValue(null);

      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 0, tabId: 1 });

      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, {
        action: 'AUTOFILL',
        payload: {
          accounts: [{ ...accounts[0], mfaInputSelector: "input[name='otp']" }],
          pinSetup: false,
        },
      });
    });

    it('should prefer user custom mfaInputSelector over predefined', async () => {
      const accounts: Account[] = [
        { id: '1', name: 'Test', issuer: 'Test', secret: 'JBSWY3DPEHPK3PXP', urlPatterns: ['github.com'], createdAt: 0, sortOrder: 0, mfaInputSelector: '#custom-input' },
      ];

      mockTabsGet.mockResolvedValue({ url: 'https://github.com/sessions/two-factor' });
      mockGetAccounts.mockResolvedValue(accounts);
      mockMatchURL.mockImplementation((pattern: string, url: string) => pattern === 'github.com');
      mockGetMfaSelector.mockReturnValue("input[name='otp']");
      mockGetPinConfig.mockResolvedValue(null);

      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 0, tabId: 1 });

      expect(mockTabsSendMessage).toHaveBeenCalledWith(1, {
        action: 'AUTOFILL',
        payload: {
          accounts: [accounts[0]],
          pinSetup: false,
        },
      });
    });

    it('should not send message if no accounts match', async () => {
      mockTabsGet.mockResolvedValue({ url: 'https://example.com' });
      mockGetAccounts.mockResolvedValue([]);
      mockMatchURL.mockReturnValue(false);

      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 0, tabId: 1 });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should skip accounts without urlPattern', async () => {
      const accounts: Account[] = [
        { id: '1', name: 'Test', issuer: 'Test', secret: 'JBSWY3DPEHPK3PXP', createdAt: 0, sortOrder: 0 },
      ];

      mockTabsGet.mockResolvedValue({ url: 'https://github.com/login' });
      mockGetAccounts.mockResolvedValue(accounts);

      await import('../index');
      const listener = webNavigationListeners[0];

      await listener({ frameId: 0, tabId: 1 });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should forward SCAN_QR to active tab', async () => {
      mockTabsQuery.mockImplementation((query: unknown, callback: (tabs: Array<{ id?: number }>) => void) => {
        callback([{ id: 42 }]);
      });

      await import('../index');
      const listener = runtimeMessageListeners[0];

      listener({ action: 'SCAN_QR' }, { tab: undefined }, vi.fn());

      await new Promise((r) => setTimeout(r, 0));

      expect(mockTabsSendMessage).toHaveBeenCalledWith(42, { action: 'SCAN_QR' });
    });

    it('should handle CAPTURE_TAB and return dataUrl', async () => {
      mockCaptureVisibleTab.mockImplementation(
        (_windowId: number, _options: { format: string }, callback: (dataUrl: string) => void) => {
          callback('data:image/png;base64,abc123');
        }
      );

      await import('../index');
      const listener = runtimeMessageListeners[0];

      const sendResponse = vi.fn();
      const result = listener(
        { action: 'CAPTURE_TAB' },
        { tab: { windowId: 100 } },
        sendResponse
      );

      expect(result).toBe(true);
      expect(mockCaptureVisibleTab).toHaveBeenCalledWith(100, { format: 'png' }, expect.any(Function));
      expect(sendResponse).toHaveBeenCalledWith({ dataUrl: 'data:image/png;base64,abc123' });
    });

    it('should handle CAPTURE_TAB when sender.tab is undefined', async () => {
      await import('../index');
      const listener = runtimeMessageListeners[0];

      const sendResponse = vi.fn();
      const result = listener(
        { action: 'CAPTURE_TAB' },
        { tab: undefined },
        sendResponse
      );

      expect(result).toBeUndefined();
      expect(mockCaptureVisibleTab).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ dataUrl: null });
    });

    it('should store QR_SCANNED data and open popup', async () => {
      await import('../index');
      const listener = runtimeMessageListeners[0];

      const payload = { secret: 'JBSWY3DPEHPK3PXP', issuer: 'Test', name: 'test@example.com' };
      listener({ action: 'QR_SCANNED', payload }, { tab: undefined }, vi.fn());

      await new Promise((r) => setTimeout(r, 10));

      expect(mockStorageLocalSet).toHaveBeenCalledWith(
        expect.objectContaining({ pendingQRScan: expect.objectContaining({ secret: payload.secret }) }),
        expect.any(Function)
      );
      expect(mockOpenPopup).toHaveBeenCalled();
    });

    it('should forward AUTOFILL_STATUS via runtime.sendMessage', async () => {
      await import('../index');
      const listener = runtimeMessageListeners[0];

      const payload = { state: 'SUCCESS' };
      listener({ action: 'AUTOFILL_STATUS', payload }, { tab: undefined }, vi.fn());

      expect(mockSendMessage).toHaveBeenCalledWith({
        action: 'AUTOFILL_STATUS',
        payload,
      });
    });
  });
});
