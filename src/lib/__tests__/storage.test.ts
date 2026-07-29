import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Account, PinConfig } from '../types';

const mockStorage: Record<string, unknown> = {};

const mockGet = vi.fn(async (keys: string | string[]) => {
  const result: Record<string, unknown> = {};
  if (Array.isArray(keys)) {
    keys.forEach((key) => {
      if (key in mockStorage) result[key] = mockStorage[key];
    });
  } else if (typeof keys === 'string') {
    if (keys in mockStorage) result[keys] = mockStorage[keys];
  }
  return result;
});

const mockSet = vi.fn(async (items: Record<string, unknown>) => {
  Object.assign(mockStorage, items);
});

const mockRemove = vi.fn(async (keys: string | string[]) => {
  if (Array.isArray(keys)) {
    keys.forEach((key) => delete mockStorage[key]);
  } else {
    delete mockStorage[keys];
  }
});

(globalThis as any).chrome = {
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
      remove: mockRemove,
    },
  },
};

const {
  getAccounts,
  saveAccount,
  deleteAccount,
  updateAccount,
  reorderAccounts,
  exportAccounts,
  importAccounts,
  getPinConfig,
  savePinConfig,
  deletePinConfig,
} = await import('../storage');

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  mockGet.mockClear();
  mockSet.mockClear();
  mockRemove.mockClear();
});

const testAccount: Account = {
  id: 'test-1',
  name: 'Slack',
  issuer: 'Slack',
  secret: 'JBSWY3DPEHPK3PXP',
  urlPatterns: ['slack.com'],
  createdAt: Date.now(),
  sortOrder: 0,
};

describe('storage', () => {
  it('should return empty array when no accounts', async () => {
    const accounts = await getAccounts();
    expect(accounts).toEqual([]);
  });

  it('should save and retrieve account', async () => {
    await saveAccount(testAccount);
    const accounts = await getAccounts();
    expect(accounts).toEqual([testAccount]);
  });

  it('should delete account', async () => {
    await saveAccount(testAccount);
    await deleteAccount('test-1');
    const accounts = await getAccounts();
    expect(accounts).toEqual([]);
  });

  it('should update account', async () => {
    await saveAccount(testAccount);
    await updateAccount({ ...testAccount, name: 'Updated' });
    const accounts = await getAccounts();
    expect(accounts[0].name).toBe('Updated');
  });

  it('should reorder accounts', async () => {
    const account2: Account = { ...testAccount, id: 'test-2', sortOrder: 1 };
    await saveAccount(testAccount);
    await saveAccount(account2);
    await reorderAccounts(['test-2', 'test-1']);
    const accounts = await getAccounts();
    expect(accounts[0].id).toBe('test-2');
    expect(accounts[1].id).toBe('test-1');
  });

  it('should export accounts as JSON', async () => {
    await saveAccount(testAccount);
    const json = await exportAccounts();
    const parsed = JSON.parse(json);
    expect(parsed).toEqual([testAccount]);
  });

  it('should import accounts from JSON', async () => {
    const json = JSON.stringify([testAccount]);
    await importAccounts(json);
    const accounts = await getAccounts();
    expect(accounts).toEqual([testAccount]);
  });
});

const mockPinConfig: PinConfig = {
  pinHash: 'dGVzdA==',
  salt: 'c2FsdA==',
  iterations: 100000,
  webAuthnCredential: null,
  isSetup: true,
};

describe('PinConfig storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no config exists', async () => {
    const result = await getPinConfig();
    expect(result).toBeNull();
  });

  it('should save and retrieve config', async () => {
    await savePinConfig(mockPinConfig);
    const result = await getPinConfig();
    expect(result).toEqual(mockPinConfig);
  });

  it('should delete config', async () => {
    await savePinConfig(mockPinConfig);
    await deletePinConfig();
    const result = await getPinConfig();
    expect(result).toBeNull();
  });
});
