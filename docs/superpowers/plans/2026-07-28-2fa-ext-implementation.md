# 2FA Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension (MV3) that manages TOTP 2FA codes with QR capture, auto-fill, and a floating status indicator.

**Architecture:** Vite + CRXJS build system with React for popup/options, TypeScript throughout. Content script handles QR capture via screen crop and auto-fill with floating status UI. Background script manages URL matching and messaging.

**Tech Stack:** Vite, CRXJS, React 18, TypeScript, otpauth, jsQR, Vitest

## Global Constraints

- Chrome Extension Manifest V3
- React 18+ for popup and options pages
- TypeScript strict mode
- No encryption for storage (plain chrome.storage.local)
- TOTP only (6 digits, 30s period, RFC 6238)
- All UI text in English (code comments can be Vietnamese)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `manifest.json`
- Create: `src/popup/index.html`
- Create: `src/popup/main.tsx`
- Create: `src/popup/App.tsx`
- Create: `src/options/index.html`
- Create: `src/options/main.tsx`
- Create: `src/options/App.tsx`
- Create: `src/background/index.ts`
- Create: `src/content/index.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: Working dev environment with `npm run dev` starting HMR

- [ ] **Step 1: Initialize npm project**

```bash
cd /Users/nals_macbook/workspace/internal/2fa-ext
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom otpauth jsQR uuid
npm install -D vite @crxjs/vite-plugin @types/react @types/react-dom @types/uuid typescript vitest
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["chrome"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "2FA Manager",
  "version": "1.0.0",
  "description": "Manage TOTP 2FA codes with auto-fill and QR capture",
  "permissions": ["storage", "activeTab", "webNavigation", "tabs"],
  "action": {
    "default_popup": "src/popup/index.html"
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"]
    }
  ],
  "options_page": "src/options/index.html",
  "icons": {
    "16": "src/assets/icon16.png",
    "48": "src/assets/icon48.png",
    "128": "src/assets/icon128.png"
  }
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
      },
    },
  },
});
```

- [ ] **Step 6: Create entry HTML files**

`src/popup/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>2FA Manager</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

`src/options/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>2FA Manager - Options</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 7: Create React entry points**

`src/popup/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/options/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 8: Create placeholder App components**

`src/popup/App.tsx`:
```typescript
export function App() {
  return (
    <div style={{ width: 350, minHeight: 400, padding: 16 }}>
      <h1>2FA Manager</h1>
      <p>Popup placeholder</p>
    </div>
  );
}
```

`src/options/App.tsx`:
```typescript
export function App() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>2FA Manager - Options</h1>
      <p>Options placeholder</p>
    </div>
  );
}
```

- [ ] **Step 9: Create placeholder background and content scripts**

`src/background/index.ts`:
```typescript
console.log('2FA Manager background script loaded');
```

`src/content/index.ts`:
```typescript
console.log('2FA Manager content script loaded');
```

- [ ] **Step 10: Create .gitignore**

```
node_modules
dist
*.log
```

- [ ] **Step 11: Verify dev server starts**

Run: `npm run dev`
Expected: Vite starts without errors

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold project with Vite + CRXJS + React"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `Account` interface, message types used by all subsequent tasks

- [ ] **Step 1: Create types.ts**

```typescript
export interface Account {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  urlPattern?: string;
  mfaInputSelector?: string;
  createdAt: number;
  sortOrder: number;
}

export interface TOTPResult {
  code: string;
  remaining: number;
}

export interface QRScanResult {
  secret: string;
  issuer: string;
  name: string;
}

export type AutofillState = 'LOADING' | 'SUCCESS' | 'ERROR' | 'MULTIPLE';

export interface AutofillStatus {
  state: AutofillState;
  message?: string;
  accounts?: Account[];
}

export interface Message {
  action: string;
  payload?: unknown;
}

export interface ScanQRMessage extends Message {
  action: 'SCAN_QR';
}

export interface QRScannedMessage extends Message {
  action: 'QR_SCANNED';
  payload: QRScanResult;
}

export interface AutofillMessage extends Message {
  action: 'AUTOFILL';
  payload: { accounts: Account[] };
}

export interface AutofillStatusMessage extends Message {
  action: 'AUTOFILL_STATUS';
  payload: AutofillStatus;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add type definitions"
```

---

### Task 3: TOTP Implementation

**Files:**
- Create: `src/lib/totp.ts`
- Create: `src/lib/__tests__/totp.test.ts`

**Interfaces:**
- Produces: `generateCode(secret: string): TOTPResult`, `parseOTPAuthURI(uri: string): QRScanResult`

- [ ] **Step 1: Write failing test**

`src/lib/__tests__/totp.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateCode, parseOTPAuthURI } from '../totp';

describe('generateCode', () => {
  it('should generate 6-digit code', () => {
    const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded
    const result = generateCode(secret);
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.remaining).toBeLessThanOrEqual(30);
  });

  it('should generate consistent codes within same period', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const result1 = generateCode(secret);
    const result2 = generateCode(secret);
    expect(result1.code).toBe(result2.code);
  });
});

describe('parseOTPAuthURI', () => {
  it('should parse otpauth:// URI with all fields', () => {
    const uri = 'otpauth://totp/Slack:john@slack.com?secret=JBSWY3DPEHPK3PXP&issuer=Slack';
    const result = parseOTPAuthURI(uri);
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.issuer).toBe('Slack');
    expect(result.name).toBe('john@slack.com');
  });

  it('should parse otpauth:// URI without issuer', () => {
    const uri = 'otpauth://totp/john@slack.com?secret=JBSWY3DPEHPK3PXP';
    const result = parseOTPAuthURI(uri);
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.issuer).toBe('');
    expect(result.name).toBe('john@slack.com');
  });

  it('should throw on invalid URI', () => {
    expect(() => parseOTPAuthURI('invalid')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/totp.test.ts`
Expected: FAIL with "Cannot find module '../totp'"

- [ ] **Step 3: Implement totp.ts**

`src/lib/totp.ts`:
```typescript
import { TOTP } from 'otpauth';
import type { TOTPResult, QRScanResult } from './types';

export function generateCode(secret: string): TOTPResult {
  const totp = new TOTP({
    secret,
    digits: 6,
    period: 30,
  });

  return {
    code: totp.generate(),
    remaining: 30 - (Math.floor(Date.now() / 1000) % 30),
  };
}

export function parseOTPAuthURI(uri: string): QRScanResult {
  if (!uri.startsWith('otpauth://totp/')) {
    throw new Error('Invalid OTP Auth URI');
  }

  const url = new URL(uri);
  const secret = url.searchParams.get('secret');
  if (!secret) {
    throw new Error('Missing secret in OTP Auth URI');
  }

  const issuer = url.searchParams.get('issuer') || '';
  const pathParts = url.pathname.split(':');
  const name = pathParts.length > 1 ? pathParts[1] : pathParts[0];

  return { secret, issuer, name: decodeURIComponent(name) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/totp.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/totp.ts src/lib/__tests__/totp.test.ts
git commit -m "feat: implement TOTP generation and URI parsing"
```

---

### Task 4: Storage Layer

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Produces: `getAccounts(): Promise<Account[]>`, `saveAccount(account: Account): Promise<void>`, `deleteAccount(id: string): Promise<void>`, `updateAccount(account: Account): Promise<void>`, `reorderAccounts(ids: string[]): Promise<void>`, `exportAccounts(): Promise<string>`, `importAccounts(json: string): Promise<void>`

- [ ] **Step 1: Write failing test**

`src/lib/__tests__/storage.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAccounts,
  saveAccount,
  deleteAccount,
  updateAccount,
  reorderAccounts,
  exportAccounts,
  importAccounts,
} from '../storage';
import type { Account } from '../types';

const mockStorage: Record<string, unknown> = {};

chrome.storage.local.get = vi.fn(async (keys: string | string[]) => {
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

chrome.storage.local.set = vi.fn(async (items: Record<string, unknown>) => {
  Object.assign(mockStorage, items);
});

chrome.storage.local.remove = vi.fn(async (keys: string | string[]) => {
  if (Array.isArray(keys)) {
    keys.forEach((key) => delete mockStorage[key]);
  } else {
    delete mockStorage[keys];
  }
});

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});

const testAccount: Account = {
  id: 'test-1',
  name: 'Slack',
  issuer: 'Slack',
  secret: 'JBSWY3DPEHPK3PXP',
  urlPattern: 'slack.com',
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/storage.test.ts`
Expected: FAIL with "Cannot find module '../storage'"

- [ ] **Step 3: Implement storage.ts**

`src/lib/storage.ts`:
```typescript
import type { Account } from './types';

const STORAGE_KEY = 'accounts';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: implement storage layer with CRUD and export/import"
```

---

### Task 5: URL Pattern Matching

**Files:**
- Create: `src/lib/url-match.ts`
- Create: `src/lib/__tests__/url-match.test.ts`

**Interfaces:**
- Produces: `matchURL(pattern: string, url: string): boolean`

- [ ] **Step 1: Write failing test**

`src/lib/__tests__/url-match.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { matchURL } from '../url-match';

describe('matchURL', () => {
  it('should match exact domain', () => {
    expect(matchURL('slack.com', 'https://slack.com/signin')).toBe(true);
  });

  it('should match domain with wildcard path', () => {
    expect(matchURL('github.com/login*', 'https://github.com/login')).toBe(true);
    expect(matchURL('github.com/login*', 'https://github.com/login/2fa')).toBe(true);
  });

  it('should not match different domain', () => {
    expect(matchURL('slack.com', 'https://github.com')).toBe(false);
  });

  it('should match subdomain', () => {
    expect(matchURL('*.slack.com', 'https://app.slack.com')).toBe(true);
  });

  it('should handle pattern without protocol', () => {
    expect(matchURL('slack.com', 'http://slack.com')).toBe(true);
    expect(matchURL('slack.com', 'https://app.slack.com')).toBe(true);
  });

  it('should handle empty pattern', () => {
    expect(matchURL('', 'https://slack.com')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/url-match.test.ts`
Expected: FAIL with "Cannot find module '../url-match'"

- [ ] **Step 3: Implement url-match.ts**

`src/lib/url-match.ts`:
```typescript
export function matchURL(pattern: string, url: string): boolean {
  if (!pattern) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^(.*\\.)?${regexPattern}$`, 'i');
      return regex.test(hostname);
    }

    return hostname === pattern || hostname.endsWith(`.${pattern}`);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/url-match.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-match.ts src/lib/__tests__/url-match.test.ts
git commit -m "feat: implement URL pattern matching"
```

---

### Task 6: QR Decode Utility

**Files:**
- Create: `src/lib/qr.ts`
- Create: `src/lib/__tests__/qr.test.ts`

**Interfaces:**
- Produces: `decodeQR(imageData: ImageData): string | null`, `decodeQRFromDataURL(dataUrl: string): Promise<string | null>`

- [ ] **Step 1: Write failing test**

`src/lib/__tests__/qr.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { decodeQR } from '../qr';

describe('decodeQR', () => {
  it('should return null for empty image data', () => {
    const imageData = new ImageData(100, 100);
    const result = decodeQR(imageData);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/qr.test.ts`
Expected: FAIL with "Cannot find module '../qr'"

- [ ] **Step 3: Implement qr.ts**

`src/lib/qr.ts`:
```typescript
import jsQR from 'jsqr';
import type { QRScanResult } from './types';
import { parseOTPAuthURI } from './totp';

export function decodeQR(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data || null;
}

export function decodeQRFromDataURL(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(decodeQR(imageData));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function parseQRContent(content: string): QRScanResult | null {
  if (content.startsWith('otpauth://totp/')) {
    try {
      return parseOTPAuthURI(content);
    } catch {
      return null;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/qr.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/qr.ts src/lib/__tests__/qr.test.ts
git commit -m "feat: implement QR decode utility"
```

---

### Task 7: Background Script — URL Matching & Messaging

**Files:**
- Modify: `src/background/index.ts`

**Interfaces:**
- Consumes: `matchURL` from `src/lib/url-match.ts`, `getAccounts` from `src/lib/storage.ts`, `generateCode` from `src/lib/totp.ts`
- Produces: Message handling for SCAN_QR, AUTOFILL

- [ ] **Step 1: Implement background script**

`src/background/index.ts`:
```typescript
import { matchURL } from '../lib/url-match';
import { getAccounts } from '../lib/storage';
import { generateCode } from '../lib/totp';
import type { Account, Message } from '../lib/types';

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
      chrome.tabs.captureVisibleTab(sender.tab!.windowId!, { format: 'png' }, (dataUrl) => {
        sendResponse({ dataUrl });
      });
      return true; // Keep message channel open for async response
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
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: implement background script with URL matching"
```

---

### Task 8: Content Script — QR Capture

**Files:**
- Modify: `src/content/index.ts`
- Create: `src/content/qr-capture.ts`
- Create: `src/content/overlay.ts`

**Interfaces:**
- Produces: QR capture flow with drag-select and screen capture via background script

- [ ] **Step 1: Create overlay.ts**

`src/content/overlay.ts`:
```typescript
export function createOverlay(): {
  overlay: HTMLDivElement;
  getSelection: () => Promise<{ x: number; y: number; width: number; height: number }>;
} {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    cursor: crosshair;
    z-index: 999999;
  `;

  const selection = document.createElement('div');
  selection.style.cssText = `
    position: absolute;
    border: 2px dashed #fff;
    background: rgba(255, 255, 255, 0.1);
    display: none;
  `;
  overlay.appendChild(selection);

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000000;
  `;
  toast.textContent = 'Drag to select QR code area. Press ESC to cancel.';
  overlay.appendChild(toast);

  function getSelection(): Promise<{ x: number; y: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      let startX = 0;
      let startY = 0;
      let isSelecting = false;

      const onMouseDown = (e: MouseEvent) => {
        startX = e.clientX;
        startY = e.clientY;
        isSelecting = true;
        selection.style.display = 'block';
        selection.style.left = `${startX}px`;
        selection.style.top = `${startY}px`;
        selection.style.width = '0';
        selection.style.height = '0';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isSelecting) return;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const width = Math.abs(e.clientX - startX);
        const height = Math.abs(e.clientY - startY);
        selection.style.left = `${x}px`;
        selection.style.top = `${y}px`;
        selection.style.width = `${width}px`;
        selection.style.height = `${height}px`;
      };

      const onMouseUp = (e: MouseEvent) => {
        isSelecting = false;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const width = Math.abs(e.clientX - startX);
        const height = Math.abs(e.clientY - startY);

        cleanup();
        document.body.removeChild(overlay);

        if (width < 10 || height < 10) {
          reject(new Error('Selection too small'));
        } else {
          resolve({ x, y, width, height });
        }
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          document.body.removeChild(overlay);
          reject(new Error('Cancelled'));
        }
      };

      const cleanup = () => {
        overlay.removeEventListener('mousedown', onMouseDown);
        overlay.removeEventListener('mousemove', onMouseMove);
        overlay.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('keydown', onKeyDown);
      };

      overlay.addEventListener('mousedown', onMouseDown);
      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
      document.addEventListener('keydown', onKeyDown);
    });
  }

  document.body.appendChild(overlay);

  return { overlay, getSelection };
}

export function showToast(message: string, isError = false): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? '#e74c3c' : '#2ecc71'};
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000000;
    transition: opacity 0.3s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}
```

- [ ] **Step 2: Create qr-capture.ts**

`src/content/qr-capture.ts`:
```typescript
import { createOverlay, showToast } from './overlay';
import { decodeQR, parseQRContent } from '../lib/qr';

async function captureVisibleTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'CAPTURE_TAB' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.dataUrl) {
        resolve(response.dataUrl);
      } else {
        reject(new Error('Failed to capture tab'));
      }
    });
  });
}

function cropImage(
  dataUrl: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(
        img,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );
      resolve(ctx.getImageData(0, 0, rect.width, rect.height));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export async function startQRCapture(): Promise<void> {
  try {
    const { getSelection } = createOverlay();
    const rect = await getSelection();

    const dataUrl = await captureVisibleTab();
    const imageData = await cropImage(dataUrl, rect);
    const qrContent = decodeQR(imageData);

    if (!qrContent) {
      showToast('No QR code found in selection', true);
      return;
    }

    const parsed = parseQRContent(qrContent);
    if (!parsed) {
      showToast('Invalid QR code content', true);
      return;
    }

    chrome.runtime.sendMessage({
      action: 'QR_SCANNED',
      payload: parsed,
    });

    showToast('QR code scanned successfully!');
  } catch (error) {
    if (error instanceof Error && error.message !== 'Cancelled') {
      showToast(`Error: ${error.message}`, true);
    }
  }
}
```

- [ ] **Step 3: Update content/index.ts**

`src/content/index.ts`:
```typescript
import { startQRCapture } from './qr-capture';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SCAN_QR') {
    startQRCapture();
  }
});
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors (note: may need to add MediaDevices type declarations)

- [ ] **Step 5: Commit**

```bash
git add src/content/overlay.ts src/content/qr-capture.ts src/content/index.ts
git commit -m "feat: implement QR capture with drag-select overlay"
```

---

### Task 9: Content Script — Auto-fill with Floating Status

**Files:**
- Create: `src/content/autofill.ts`
- Modify: `src/content/index.ts`

**Interfaces:**
- Consumes: `generateCode` from `src/lib/totp.ts`
- Produces: Auto-fill MFA input fields with floating status indicator

- [ ] **Step 1: Create autofill.ts**

`src/content/autofill.ts`:
```typescript
import { generateCode } from '../lib/totp';
import type { Account, AutofillState } from '../lib/types';

let floatingIcon: HTMLDivElement | null = null;
let dropupMenu: HTMLDivElement | null = null;

function createFloatingIcon(): HTMLDivElement {
  const icon = document.createElement('div');
  icon.id = 'twofa-floating-icon';
  icon.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3498db;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s;
    font-size: 18px;
  `;
  document.body.appendChild(icon);
  return icon;
}

function updateIconState(state: AutofillState, message?: string): void {
  if (!floatingIcon) return;

  switch (state) {
    case 'LOADING':
      floatingIcon.innerHTML = '⏳';
      floatingIcon.title = 'Waiting for page to load...';
      floatingIcon.style.background = '#3498db';
      break;
    case 'SUCCESS':
      floatingIcon.innerHTML = '✓';
      floatingIcon.title = message || 'Code filled successfully';
      floatingIcon.style.background = '#2ecc71';
      setTimeout(() => {
        if (floatingIcon) {
          floatingIcon.style.opacity = '0';
          setTimeout(() => {
            if (floatingIcon && floatingIcon.parentNode) {
              floatingIcon.parentNode.removeChild(floatingIcon);
              floatingIcon = null;
            }
          }, 300);
        }
      }, 5000);
      break;
    case 'ERROR':
      floatingIcon.innerHTML = '✕';
      floatingIcon.title = message || 'Error occurred';
      floatingIcon.style.background = '#e74c3c';
      setTimeout(() => {
        if (floatingIcon) {
          floatingIcon.style.opacity = '0';
          setTimeout(() => {
            if (floatingIcon && floatingIcon.parentNode) {
              floatingIcon.parentNode.removeChild(floatingIcon);
              floatingIcon = null;
            }
          }, 300);
        }
      }, 5000);
      break;
    case 'MULTIPLE':
      floatingIcon.innerHTML = '⋯';
      floatingIcon.title = 'Multiple accounts matched. Click to select.';
      floatingIcon.style.background = '#f39c12';
      break;
  }
}

function createDropupMenu(accounts: Account[]): void {
  if (dropupMenu) {
    dropupMenu.parentNode?.removeChild(dropupMenu);
  }

  dropupMenu = document.createElement('div');
  dropupMenu.style.cssText = `
    position: fixed;
    bottom: 70px;
    right: 20px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 1000000;
    min-width: 280px;
    max-height: 300px;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  accounts.forEach((account) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    `;
    item.onmouseenter = () => (item.style.background = '#f5f5f5');
    item.onmouseleave = () => (item.style.background = '#fff');

    const avatar = document.createElement('div');
    avatar.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #3498db;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      margin-right: 12px;
      position: relative;
    `;
    avatar.textContent = account.name.charAt(0).toUpperCase();

    const ring = document.createElement('div');
    ring.style.cssText = `
      position: absolute;
      top: -2px;
      left: -2px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: #2ecc71;
      animation: twofa-spin 1s linear infinite;
    `;
    avatar.appendChild(ring);

    const info = document.createElement('div');
    info.style.cssText = `flex: 1; min-width: 0;`;

    const name = document.createElement('div');
    name.style.cssText = `
      font-weight: 500;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    name.textContent = account.name;

    const code = document.createElement('div');
    code.style.cssText = `
      font-family: monospace;
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-top: 2px;
    `;

    const { code: totpCode, remaining } = generateCode(account.secret);
    code.textContent = totpCode;

    const countdown = document.createElement('div');
    countdown.style.cssText = `
      font-size: 12px;
      color: #999;
      margin-left: 8px;
    `;
    countdown.textContent = `${remaining}s`;

    info.appendChild(name);
    info.appendChild(code);

    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(countdown);

    item.onclick = () => {
      fillCode(account, totpCode);
      closeDropupMenu();
    };

    dropupMenu!.appendChild(item);
  });

  document.body.appendChild(dropupMenu);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes twofa-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function closeDropupMenu(): void {
  if (dropupMenu && dropupMenu.parentNode) {
    dropupMenu.parentNode.removeChild(dropupMenu);
    dropupMenu = null;
  }
}

function findMFAInput(account: Account): HTMLInputElement | null {
  if (account.mfaInputSelector) {
    const el = document.querySelector(account.mfaInputSelector);
    if (el instanceof HTMLInputElement) return el;
  }

  const selectors = [
    'input[autocomplete="one-time-code"]',
    'input[name*="code" i]',
    'input[name*="token" i]',
    'input[name*="otp" i]',
    'input[type="tel"][maxlength="6"]',
    'input[type="number"][maxlength="6"]',
    'input[pattern="[0-9]*"][maxlength="6"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLInputElement) return el;
  }

  return null;
}

function fillCode(account: Account, code: string): void {
  const input = findMFAInput(account);
  if (!input) {
    updateIconState('ERROR', 'MFA input field not found');
    return;
  }

  input.value = code;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

  updateIconState('SUCCESS', `Code filled for ${account.name}`);
}

export async function handleAutofill(accounts: Account[]): Promise<void> {
  floatingIcon = createFloatingIcon();
  updateIconState('LOADING');

  await new Promise((resolve) => setTimeout(resolve, 500));

  if (accounts.length === 1) {
    const { code } = generateCode(accounts[0].secret);
    fillCode(accounts[0], code);
  } else if (accounts.length > 1) {
    const { code } = generateCode(accounts[0].secret);
    fillCode(accounts[0], code);
    updateIconState('MULTIPLE');

    floatingIcon?.addEventListener('click', () => {
      if (dropupMenu) {
        closeDropupMenu();
      } else {
        createDropupMenu(accounts);
      }
    });

    document.addEventListener('click', (e) => {
      if (
        dropupMenu &&
        !dropupMenu.contains(e.target as Node) &&
        e.target !== floatingIcon
      ) {
        closeDropupMenu();
      }
    });
  }
}
```

- [ ] **Step 2: Update content/index.ts**

`src/content/index.ts`:
```typescript
import { startQRCapture } from './qr-capture';
import { handleAutofill } from './autofill';
import type { Account } from '../lib/types';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SCAN_QR') {
    startQRCapture();
  }

  if (message.action === 'AUTOFILL') {
    const accounts = message.payload?.accounts as Account[];
    if (accounts && accounts.length > 0) {
      handleAutofill(accounts);
    }
  }
});
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/content/autofill.ts src/content/index.ts
git commit -m "feat: implement auto-fill with floating status indicator"
```

---

### Task 10: Popup UI

**Files:**
- Modify: `src/popup/App.tsx`
- Create: `src/popup/AccountList.tsx`
- Create: `src/popup/AccountCard.tsx`
- Create: `src/popup/AddAccountForm.tsx`

**Interfaces:**
- Consumes: `getAccounts`, `saveAccount`, `deleteAccount`, `reorderAccounts` from storage, `generateCode` from totp, `parseQRContent` from qr

- [ ] **Step 1: Create AccountCard component**

`src/popup/AccountCard.tsx`:
```typescript
import { useState, useEffect } from 'react';
import type { Account } from '../lib/types';
import { generateCode } from '../lib/totp';

interface Props {
  account: Account;
  onDelete: (id: string) => void;
}

export function AccountCard({ account, onDelete }: Props) {
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    const update = () => {
      const result = generateCode(account.secret);
      setCode(result.code);
      setRemaining(result.remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [account.secret]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
  };

  const circumference = 2 * Math.PI * 14;
  const dashoffset = circumference * (remaining / 30);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      background: '#fff',
      borderRadius: '8px',
      marginBottom: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{ position: 'relative', marginRight: '12px' }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#eee" strokeWidth="2" />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke={remaining < 5 ? '#e74c3c' : '#2ecc71'}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 16 16)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          fontWeight: 'bold',
        }}>
          {account.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>{account.name}</div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '20px',
          fontWeight: 'bold',
          letterSpacing: '2px',
          color: '#333',
        }}>
          {code}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={copyCode} style={{
          background: '#3498db',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          Copy
        </button>
        <button onClick={() => onDelete(account.id)} style={{
          background: '#e74c3c',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          Delete
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AccountList component**

`src/popup/AccountList.tsx`:
```typescript
import type { Account } from '../lib/types';
import { AccountCard } from './AccountCard';

interface Props {
  accounts: Account[];
  onDelete: (id: string) => void;
}

export function AccountList({ accounts, onDelete }: Props) {
  if (accounts.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#999',
      }}>
        No accounts yet. Click "Add Account" to get started.
      </div>
    );
  }

  return (
    <div>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create AddAccountForm component**

`src/popup/AddAccountForm.tsx`:
```typescript
import { useState } from 'react';
import type { Account } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onAdd: (account: Account) => void;
  onCancel: () => void;
  initialData?: { secret: string; issuer: string; name: string };
}

export function AddAccountForm({ onAdd, onCancel, initialData }: Props) {
  const [name, setName] = useState(initialData?.name || '');
  const [secret, setSecret] = useState(initialData?.secret || '');
  const [issuer, setIssuer] = useState(initialData?.issuer || '');
  const [urlPattern, setUrlPattern] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !secret) return;

    const account: Account = {
      id: uuidv4(),
      name,
      issuer,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      urlPattern: urlPattern || undefined,
      createdAt: Date.now(),
      sortOrder: 0,
    };
    onAdd(account);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px' }}>Add Account</h3>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Account Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Slack, GitHub"
          required
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Secret Key *
        </label>
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Base32 secret key"
          required
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Issuer
        </label>
        <input
          type="text"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder="e.g., Slack, GitHub"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          URL Pattern (for auto-fill)
        </label>
        <input
          type="text"
          value={urlPattern}
          onChange={(e) => setUrlPattern(e.target.value)}
          placeholder="e.g., slack.com, github.com/login*"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" style={{
          background: '#2ecc71',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
          cursor: 'pointer',
          flex: 1,
        }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{
          background: '#95a5a6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
          cursor: 'pointer',
          flex: 1,
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Update App.tsx**

`src/popup/App.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { AccountList } from './AccountList';
import { AddAccountForm } from './AddAccountForm';
import { getAccounts, saveAccount, deleteAccount } from '../lib/storage';
import { parseQRContent } from '../lib/qr';
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
```

- [ ] **Step 5: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/popup/App.tsx src/popup/AccountCard.tsx src/popup/AccountList.tsx src/popup/AddAccountForm.tsx
git commit -m "feat: implement popup UI with account list and add form"
```

---

### Task 11: Options Page UI

**Files:**
- Modify: `src/options/App.tsx`
- Create: `src/options/AccountEditor.tsx`

**Interfaces:**
- Consumes: `getAccounts`, `saveAccount`, `deleteAccount`, `updateAccount`, `reorderAccounts`, `exportAccounts`, `importAccounts` from storage

- [ ] **Step 1: Create AccountEditor component**

`src/options/AccountEditor.tsx`:
```typescript
import { useState } from 'react';
import type { Account } from '../lib/types';

interface Props {
  account: Account;
  onUpdate: (account: Account) => void;
  onDelete: (id: string) => void;
}

export function AccountEditor({ account, onUpdate, onDelete }: Props) {
  const [name, setName] = useState(account.name);
  const [secret, setSecret] = useState(account.secret);
  const [issuer, setIssuer] = useState(account.issuer);
  const [urlPattern, setUrlPattern] = useState(account.urlPattern || '');
  const [mfaInputSelector, setMfaInputSelector] = useState(account.mfaInputSelector || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate({
      ...account,
      name,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      issuer,
      urlPattern: urlPattern || undefined,
      mfaInputSelector: mfaInputSelector || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Secret</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Issuer</label>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>URL Pattern</label>
          <input
            type="text"
            value={urlPattern}
            onChange={(e) => setUrlPattern(e.target.value)}
            placeholder="e.g., slack.com"
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>MFA Input Selector</label>
          <input
            type="text"
            value={mfaInputSelector}
            onChange={(e) => setMfaInputSelector(e.target.value)}
            placeholder="CSS selector for MFA input"
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSave} style={{ background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', flex: 1 }}>Save</button>
          <button onClick={() => setIsEditing(false)} style={{ background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', flex: 1 }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 500 }}>{account.name}</div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          {account.issuer && `${account.issuer} • `}
          {account.urlPattern || 'No URL pattern'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setIsEditing(true)} style={{ background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
        <button onClick={() => onDelete(account.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx for options page**

`src/options/App.tsx`:
```typescript
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
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/options/App.tsx src/options/AccountEditor.tsx
git commit -m "feat: implement options page with account editor and export/import"
```

---

### Task 12: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build extension**

Run: `npm run build`
Expected: Build succeeds, `dist/` folder created

- [ ] **Step 4: Load extension in Chrome**

1. Open Chrome, go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Extension should load without errors

- [ ] **Step 5: Manual smoke test**

1. Click extension icon → popup should open
2. Click "+ Add" → form should appear
3. Enter test account: name="Test", secret="JBSWY3DPEHPK3PXP"
4. Save → should see account with live code
5. Click "Copy" → code should be in clipboard
6. Open options page → should see account editor
7. Click "Export" → JSON file should download

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: final verification complete"
```
