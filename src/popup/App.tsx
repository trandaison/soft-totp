import { useState, useEffect } from 'react';
import { AccountList } from './AccountList';
import { AddAccountForm } from './AddAccountForm';
import { getAccounts, saveAccount, deleteAccount } from '../lib/storage';
import type { Account } from '../lib/types';

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [scannedData, setScannedData] = useState<{
    secret: string;
    issuer: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    const listener = (message: { action: string; payload?: unknown }) => {
      if (message.action === 'QR_SCANNED') {
        const payload = message.payload as {
          secret: string;
          issuer: string;
          name: string;
        };
        setScannedData(payload);
        setShowForm(true);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const loadAccounts = async () => {
    const loaded = await getAccounts();
    setAccounts(loaded.sort((a, b) => a.sortOrder - b.sortOrder));
  };

  const handleAdd = async (account: Account) => {
    await saveAccount(account);
    await loadAccounts();
    setShowForm(false);
    setScannedData(null);
  };

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
    await loadAccounts();
  };

  const handleScanQR = () => {
    chrome.runtime.sendMessage({ action: 'SCAN_QR' });
  };

  return (
    <div style={{ width: 350, minHeight: 400, background: '#f5f5f5' }}>
      <div style={{
        background: '#3498db',
        color: '#fff',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>2FA Manager</h1>
        {!showForm && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: '#fff',
                color: '#3498db',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              + Add
            </button>
            <button
              onClick={handleScanQR}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Scan QR
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: '12px' }}>
        {showForm ? (
          <AddAccountForm
            onAdd={handleAdd}
            onCancel={() => {
              setShowForm(false);
              setScannedData(null);
            }}
            initialData={scannedData || undefined}
          />
        ) : (
          <AccountList accounts={accounts} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
