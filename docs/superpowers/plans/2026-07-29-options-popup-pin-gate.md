# Options & Popup PIN Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Options page with sidebar layout, add PIN gate to both Options and Popup, implement shared unlock state with 10s grace period.

**Architecture:** Background-managed unlock state via `chrome.storage.local`. Popup uses `chrome.runtime.connect()` port for close detection. Options shows full-page PIN login when locked.

**Tech Stack:** React, TypeScript, Chrome Extension APIs (`chrome.storage.local`, `chrome.runtime`)

## Global Constraints

- All PIN verification goes through background script messages
- Grace period = 10000ms (10 seconds)
- Unlock state stored at key `unlockState` in `chrome.storage.local`
- PIN form: 6-digit numeric input, auto-submit on complete, shake on error
- Use existing `colors` from `src/lib/colors.ts` for all styling

---

### Task 1: Add UnlockState types and storage helpers

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage.ts`

**Interfaces:**
- Produces: `UnlockState` type, `getUnlockState()`, `saveUnlockState()` functions used by Tasks 2, 3, 4

- [ ] **Step 1: Add UnlockState interface to types.ts**

```typescript
// Add after VerifyPinMessage interface (line 88)
export interface UnlockState {
  unlockedUntil: number; // timestamp ms, 0 = locked
}
```

- [ ] **Step 2: Add unlock state storage helpers to storage.ts**

```typescript
// Add import at top: add UnlockState to the import
import type { Account, PinConfig, UnlockState } from './types';

// Add after deletePinConfig function
const UNLOCK_STATE_KEY = 'unlockState';

export async function getUnlockState(): Promise<UnlockState> {
  const result = await chrome.storage.local.get(UNLOCK_STATE_KEY);
  return (result[UNLOCK_STATE_KEY] as UnlockState) || { unlockedUntil: 0 };
}

export async function saveUnlockState(state: UnlockState): Promise<void> {
  await chrome.storage.local.set({ [UNLOCK_STATE_KEY]: state });
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/storage.ts
git commit -m "feat: add UnlockState type and storage helpers"
```

---

### Task 2: Add CHECK_UNLOCK, DO_UNLOCK handlers to background

**Files:**
- Modify: `src/background/index.ts:1-6` (imports)
- Modify: `src/background/index.ts:86-313` (message listener)

**Interfaces:**
- Consumes: `getUnlockState`, `saveUnlockState`, `getPinConfig` from storage
- Consumes: `verifyPin` from pin
- Produces: Message handlers `CHECK_UNLOCK`, `DO_UNLOCK` consumed by Tasks 3, 4

- [ ] **Step 1: Update imports in background/index.ts**

```typescript
// Line 2 — add getUnlockState, saveUnlockState
import { getAccounts, getPinConfig, savePinConfig, deletePinConfig, getUnlockState, saveUnlockState } from '../lib/storage';
```

- [ ] **Step 2: Add CHECK_UNLOCK handler inside onMessage listener**

Add after the `GET_PIN_CONFIG` handler block (after line 93):

```typescript
    if (message.action === 'CHECK_UNLOCK') {
      (async () => {
        try {
          const [pinConfig, unlockState] = await Promise.all([getPinConfig(), getUnlockState()]);
          const pinSetup = pinConfig?.isSetup ?? false;
          const unlocked = pinSetup ? Date.now() < unlockState.unlockedUntil : true;
          sendResponse({ unlocked, pinSetup });
        } catch (error) {
          sendResponse({ unlocked: false, pinSetup: false, error: (error as Error).message });
        }
      })();
      return true;
    }

    if (message.action === 'DO_UNLOCK') {
      const { pin } = message.payload as { pin: string };
      (async () => {
        try {
          const config = await getPinConfig();
          if (!config || !config.isSetup) {
            sendResponse({ success: false, error: 'PIN not configured' });
            return;
          }
          const salt = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
          const isValid = await verifyPin(pin, config.pinHash, salt, config.iterations);
          if (!isValid) {
            sendResponse({ success: false });
            return;
          }
          await saveUnlockState({ unlockedUntil: Infinity });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();
      return true;
    }
```

- [ ] **Step 3: Add port-based disconnect listener for grace period**

Add after the `chrome.runtime.onMessage.addListener(...)` block (after line 313):

```typescript
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(() => {
      saveUnlockState({ unlockedUntil: Date.now() + 10000 }).catch(() => {});
    });
  }
});
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: add CHECK_UNLOCK, DO_UNLOCK handlers and grace period port listener"
```

---

### Task 3: Create PinGate component for popup

**Files:**
- Create: `src/popup/PinGate.tsx`

**Interfaces:**
- Consumes: `DO_UNLOCK` message (from Task 2)
- Produces: `PinGate` component used by Task 5

- [ ] **Step 1: Create PinGate.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { colors } from '../lib/colors';

interface Props {
  onUnlocked: () => void;
}

export function PinGate({ onUnlocked }: Props) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(false);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const pin = newDigits.join('');
      if (pin.length === 6) {
        submitPin(pin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length === 6) submitPin(pin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    pasted.split('').forEach((d, i) => { newDigits[i] = d; });
    setDigits(newDigits);
    setError(false);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) submitPin(newDigits.join(''));
  };

  const submitPin = async (pin: string) => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'DO_UNLOCK', payload: { pin } });
      if (response?.success) {
        onUnlocked();
      } else {
        triggerError();
      }
    } catch {
      triggerError();
    }
  };

  const triggerError = () => {
    setError(true);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setDigits(['', '', '', '', '', '']);
      setError(false);
      inputRefs.current[0]?.focus();
    }, 500);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      padding: '40px 24px',
      background: colors.bg,
    }}>
      <div style={{
        fontSize: '32px',
        marginBottom: '16px',
      }}>
        🔒
      </div>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: colors.textPrimary,
        marginBottom: '24px',
      }}>
        Nhập mã PIN để mở khóa
      </div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          animation: shaking ? 'twofa-shake 0.4s ease-in-out' : 'none',
        }}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoComplete="off"
            style={{
              width: 40,
              height: 48,
              border: `2px solid ${error ? colors.error : 'rgba(0,0,0,0.15)'}`,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.7)',
              color: colors.textPrimary,
              fontSize: 20,
              fontWeight: 600,
              textAlign: 'center',
              outline: 'none',
              fontFamily: 'monospace',
              transition: 'border-color 0.2s',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes twofa-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/popup/PinGate.tsx
git commit -m "feat: add PinGate component for popup PIN protection"
```

---

### Task 4: Create PinLogin component for options page

**Files:**
- Create: `src/options/PinLogin.tsx`

**Interfaces:**
- Consumes: `DO_UNLOCK` message (from Task 2)
- Produces: `PinLogin` component used by Task 6

- [ ] **Step 1: Create PinLogin.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { colors } from '../lib/colors';

interface Props {
  onUnlocked: () => void;
}

export function PinLogin({ onUnlocked }: Props) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(false);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const pin = newDigits.join('');
      if (pin.length === 6) submitPin(pin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length === 6) submitPin(pin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    pasted.split('').forEach((d, i) => { newDigits[i] = d; });
    setDigits(newDigits);
    setError(false);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) submitPin(newDigits.join(''));
  };

  const submitPin = async (pin: string) => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'DO_UNLOCK', payload: { pin } });
      if (response?.success) {
        onUnlocked();
      } else {
        triggerError();
      }
    } catch {
      triggerError();
    }
  };

  const triggerError = () => {
    setError(true);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setDigits(['', '', '', '', '', '']);
      setError(false);
      inputRefs.current[0]?.focus();
    }, 500);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: colors.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '48px 40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${colors.borderLight}`,
        textAlign: 'center',
        minWidth: 320,
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          color: colors.textPrimary,
          fontSize: '24px',
          fontWeight: 600,
        }}>
          Soft TOTP
        </h1>
        <div style={{
          fontSize: '14px',
          color: colors.textSecondary,
          marginBottom: '32px',
        }}>
          Nhập mã PIN để truy cập Settings
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '16px',
            animation: shaking ? 'twofa-shake 0.4s ease-in-out' : 'none',
          }}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoComplete="off"
              style={{
                width: 44,
                height: 52,
                border: `2px solid ${error ? colors.error : colors.border}`,
                borderRadius: 8,
                background: colors.bgCard,
                color: colors.textPrimary,
                fontSize: 22,
                fontWeight: 600,
                textAlign: 'center',
                outline: 'none',
                fontFamily: 'monospace',
                transition: 'border-color 0.2s',
              }}
            />
          ))}
        </div>
        {error && (
          <div style={{ color: colors.error, fontSize: '13px', marginTop: '8px' }}>
            PIN không đúng, vui lòng thử lại
          </div>
        )}
      </div>
      <style>{`
        @keyframes twofa-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/options/PinLogin.tsx
git commit -m "feat: add PinLogin component for options page PIN gate"
```

---

### Task 5: Add PIN gate to popup App.tsx

**Files:**
- Modify: `src/popup/App.tsx`

**Interfaces:**
- Consumes: `PinGate` component (from Task 3)
- Consumes: `CHECK_UNLOCK` message (from Task 2)

- [ ] **Step 1: Rewrite popup/App.tsx with PIN gate**

Replace entire file content:

```tsx
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
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/popup/App.tsx
git commit -m "feat: add PIN gate to popup with 10s grace period"
```

---

### Task 6: Create Sidebar component and rewrite options App.tsx

**Files:**
- Create: `src/options/Sidebar.tsx`
- Modify: `src/options/App.tsx`

**Interfaces:**
- Consumes: `PinLogin` component (from Task 4)
- Consumes: `CHECK_UNLOCK` message (from Task 2)
- Consumes: `AutofillRulesDebug`, `PinSettings` (existing)

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
import { colors } from '../lib/colors';

export type Subpage = 'rules' | 'security' | 'import-export';

interface Props {
  active: Subpage;
  onChange: (page: Subpage) => void;
}

const items: { key: Subpage; label: string; icon: string }[] = [
  { key: 'rules', label: 'Autofill Rules', icon: '⚙️' },
  { key: 'security', label: 'Security', icon: '🔒' },
  { key: 'import-export', label: 'Import & Export', icon: '📦' },
];

export function Sidebar({ active, onChange }: Props) {
  return (
    <nav style={{
      width: 200,
      flexShrink: 0,
      background: colors.bgCard,
      borderRight: `1px solid ${colors.borderLight}`,
      padding: '16px 0',
      minHeight: '100vh',
    }}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 20px',
            border: 'none',
            background: active === item.key ? `${colors.primary}10` : 'transparent',
            color: active === item.key ? colors.primary : colors.textPrimary,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: active === item.key ? 600 : 400,
            textAlign: 'left',
            borderLeft: active === item.key ? `3px solid ${colors.primary}` : '3px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Rewrite options/App.tsx**

Replace entire file content:

```tsx
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
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/options/Sidebar.tsx src/options/App.tsx
git commit -m "feat: restructure options page with sidebar layout and PIN gate"
```

---

### Task 7: Verify full build and test manually

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds, output in `dist/`

- [ ] **Step 3: Run existing tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address build/test issues"
```
