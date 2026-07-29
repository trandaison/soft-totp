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
import { colors } from '../lib/colors';

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
    if (window.confirm('Are you sure you want to delete this account?')) {
      await deleteAccount(id);
      await loadAccounts();
    }
  };

  const handleExport = async () => {
    const json = await exportAccounts();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soft-totp-accounts.json';
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
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: colors.bg,
      minHeight: '100vh',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: `2px solid ${colors.borderLight}`,
      }}>
        <h1 style={{
          margin: 0,
          color: colors.textPrimary,
          fontSize: '24px',
          fontWeight: 600,
        }}>
          Soft TOTP
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            style={{
              background: colors.primaryLight,
              color: colors.textLight,
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Export
          </button>
          <button
            onClick={handleImport}
            style={{
              background: colors.primary,
              color: colors.textLight,
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Import
          </button>
        </div>
      </div>
      {accounts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 40px',
          color: colors.textSecondary,
          background: colors.bgCard,
          borderRadius: '12px',
          border: `1px dashed ${colors.border}`,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🔐</div>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>No accounts configured</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>Add accounts from the popup extension</div>
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
