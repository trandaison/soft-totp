import { useState, useEffect } from 'react';
import { Sidebar, Subpage } from './Sidebar';
import { PinLogin } from './PinLogin';
import { PinSettings } from './PinSettings';
import { AutofillRulesDebug } from './AutofillRulesDebug';
import { exportAccounts, importAccounts } from '../lib/storage';
import { colors } from '../lib/colors';

function ImportExportPage() {
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
        alert('Import successful');
      } catch {
        alert('Invalid file format');
      }
    };
    input.click();
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: colors.textPrimary }}>
        Import & Export
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '20px' }}>
        Export accounts to JSON file or import from a backup.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleExport}
          style={{
            background: colors.primaryLight,
            color: colors.textLight,
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Export Accounts
        </button>
        <button
          onClick={handleImport}
          style={{
            background: colors.primary,
            color: colors.textLight,
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Import Accounts
        </button>
      </div>
    </div>
  );
}

export function App() {
  const [activePage, setActivePage] = useState<Subpage>('rules');
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'CHECK_UNLOCK' }, (response) => {
      if (response?.pinSetup && !response?.unlocked) {
        setLocked(true);
      } else {
        setLocked(false);
      }
    });
  }, []);

  if (locked === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: colors.bg,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  if (locked) {
    return <PinLogin onUnlocked={() => setLocked(false)} />;
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: colors.bg,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.borderLight}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, color: colors.textPrimary, fontSize: '20px', fontWeight: 600 }}>
          Soft TOTP
        </h1>
      </header>
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar active={activePage} onChange={setActivePage} />
        <main style={{ flex: 1, padding: '24px 32px' }}>
          {activePage === 'rules' && <AutofillRulesDebug />}
          {activePage === 'security' && <PinSettings />}
          {activePage === 'import-export' && <ImportExportPage />}
        </main>
      </div>
    </div>
  );
}
