import { useState, useEffect } from 'react';
import { AccountEditor } from './AccountEditor';
import {
  getAccounts,
  updateAccount,
  deleteAccount,
  reorderAccounts,
  exportAccounts,
  importAccounts,
} from '../lib/storage';
import type { Account } from '../lib/types';

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const loaded = await getAccounts();
    setAccounts(loaded.sort((a, b) => a.sortOrder - b.sortOrder));
  };

  const handleUpdate = async (account: Account) => {
    await updateAccount(account);
    await loadAccounts();
  };

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
    await loadAccounts();
  };

  const handleExport = async () => {
    const json = await exportAccounts();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-accounts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        await importAccounts(text);
        await loadAccounts();
      } catch {
        alert('Invalid file format');
      }
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>2FA Manager - Options</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExport} style={{ background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Export</button>
          <button onClick={handleImport} style={{ background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Import</button>
        </div>
      </div>
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No accounts configured. Add accounts from the popup.
        </div>
      ) : (
        accounts.map((account) => (
          <AccountEditor
            key={account.id}
            account={account}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}
