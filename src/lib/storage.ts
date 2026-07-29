import type { Account, PinConfig } from './types';

const STORAGE_KEY = 'accounts';
const PIN_CONFIG_KEY = 'pinConfig';

export async function getAccounts(): Promise<Account[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Account[]) || [];
}

export async function saveAccount(account: Account): Promise<void> {
  const accounts = await getAccounts();
  accounts.push(account);
  await chrome.storage.local.set({ [STORAGE_KEY]: accounts });
}

export async function deleteAccount(id: string): Promise<void> {
  const accounts = await getAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

export async function updateAccount(updated: Account): Promise<void> {
  const accounts = await getAccounts();
  const index = accounts.findIndex((a) => a.id === updated.id);
  if (index === -1) throw new Error('Account not found');
  accounts[index] = updated;
  await chrome.storage.local.set({ [STORAGE_KEY]: accounts });
}

export async function reorderAccounts(ids: string[]): Promise<void> {
  const accounts = await getAccounts();
  const reordered = ids
    .map((id, index) => {
      const account = accounts.find((a) => a.id === id);
      if (!account) throw new Error(`Account ${id} not found`);
      return { ...account, sortOrder: index };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  await chrome.storage.local.set({ [STORAGE_KEY]: reordered });
}

export async function exportAccounts(): Promise<string> {
  const accounts = await getAccounts();
  return JSON.stringify(accounts, null, 2);
}

export async function importAccounts(json: string): Promise<void> {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('Invalid format');
  await chrome.storage.local.set({ [STORAGE_KEY]: parsed });
}

export async function getPinConfig(): Promise<PinConfig | null> {
  const result = await chrome.storage.local.get(PIN_CONFIG_KEY);
  return (result[PIN_CONFIG_KEY] as PinConfig) || null;
}

export async function savePinConfig(config: PinConfig): Promise<void> {
  await chrome.storage.local.set({ [PIN_CONFIG_KEY]: config });
}

export async function deletePinConfig(): Promise<void> {
  await chrome.storage.local.remove(PIN_CONFIG_KEY);
}
