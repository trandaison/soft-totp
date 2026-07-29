import { useState, useEffect } from 'react';
import { AccountList } from './AccountList';
import { AddAccountForm } from './AddAccountForm';
import { EditAccountForm } from './EditAccountForm';
import { PinGate } from './PinGate';
import { getAccounts, saveAccount, deleteAccount, updateAccount } from '../lib/storage';
import type { Account } from '../lib/types';
import { colors } from '../lib/colors';

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [scannedData, setScannedData] = useState<{
    secret: string;
    issuer: string;
    name: string;
    logoUrl?: string;
  } | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'popup' });

    chrome.runtime.sendMessage({ action: 'CHECK_UNLOCK' }, (response) => {
      if (response?.pinSetup && !response?.unlocked) {
        setLocked(true);
      } else {
        setLocked(false);
        loadAccounts();
      }
    });

    return () => {
      port.disconnect();
    };
  }, []);

  useEffect(() => {
    if (locked !== false) return;

    loadAccounts();

    chrome.storage.local.get('pendingQRScan', (result) => {
      if (result.pendingQRScan) {
        chrome.storage.local.remove('pendingQRScan');
        const payload = result.pendingQRScan as {
          secret: string;
          issuer: string;
          name: string;
          logoUrl?: string;
        };
        setScannedData(payload);
        setShowForm('add');
      }
    });
  }, [locked]);

  useEffect(() => {
    if (locked !== false) return;

    const listener = (message: { action: string; payload?: unknown }) => {
      if (message.action === 'QR_SCANNED') {
        const payload = message.payload as {
          secret: string;
          issuer: string;
          name: string;
          logoUrl?: string;
        };
        setScannedData(payload);
        setShowForm('add');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [locked]);

  const loadAccounts = async () => {
    const loaded = await getAccounts();
    setAccounts(loaded.sort((a, b) => a.sortOrder - b.sortOrder));
  };

  const handleAdd = async (account: Account) => {
    await saveAccount(account);
    await loadAccounts();
    setShowForm(null);
    setScannedData(null);
  };

  const handleUpdate = async (account: Account) => {
    await updateAccount(account);
    await loadAccounts();
    setShowForm(null);
    setEditingAccount(null);
  };

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
    await loadAccounts();
  };

  const handleEdit = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (account) {
      setEditingAccount(account);
      setShowForm('edit');
    }
  };

  const handleScanQR = () => {
    chrome.runtime.sendMessage({ action: 'SCAN_QR' });
    window.close();
  };

  if (locked === null) {
    return (
      <div style={{ width: 350, minHeight: 400, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  if (locked) {
    return (
      <div style={{ width: 350, minHeight: 400 }}>
        <PinGate onUnlocked={() => setLocked(false)} />
      </div>
    );
  }

  return (
    <div style={{ width: 350, minHeight: 400, background: colors.bg }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
        color: colors.textLight,
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Soft TOTP</h1>
        {!showForm && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowForm('add')}
              style={{
                background: colors.textLight,
                color: colors.primary,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              + Add
            </button>
            <button
              onClick={handleScanQR}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: colors.textLight,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Scan QR
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: '12px' }}>
        {showForm === 'add' ? (
          <AddAccountForm
            onAdd={handleAdd}
            onCancel={() => {
              setShowForm(null);
              setScannedData(null);
            }}
            initialData={scannedData || undefined}
          />
        ) : showForm === 'edit' && editingAccount ? (
          <EditAccountForm
            account={editingAccount}
            onSave={handleUpdate}
            onCancel={() => {
              setShowForm(null);
              setEditingAccount(null);
            }}
          />
        ) : (
          <AccountList accounts={accounts} onDelete={handleDelete} onEdit={handleEdit} />
        )}
      </div>
    </div>
  );
}
