# PIN Protection for TOTP Autofill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6-digit PIN layer to protect TOTP auto-fill, with PBKDF2 hashing and WebAuthn biometric verification.

**Architecture:** Background-centric — content script renders PIN popup UI, sends PIN to background service worker for PBKDF2 hash verification. WebAuthn handled via popup/options page.

**Tech Stack:** TypeScript, React 19, Web Crypto API (PBKDF2), WebAuthn API, Shadow DOM, CSS animations

## Global Constraints

- PIN: 6 digits, numeric only
- Hash: PBKDF2-SHA256, 100,000 iterations, 16-byte random salt, 256-bit output
- WebAuthn: `authenticatorAttachment: 'platform'`, `userVerification: 'required'`
- PIN verify on every autofill trigger (no session/cache)
- Popup: glassmorphism, Shadow DOM (`mode: 'closed'`), fixed top-right (20px, 20px)
- Animation: gravity-bounce from top-right, 3 phases (400ms + 200ms + 200ms)
- Storage: `chrome.storage.local` key `"pinConfig"`
- Existing code style: inline styles (React CSSProperties), no CSS framework

---

### Task 1: Add PinConfig Type and Storage Functions

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage.ts`
- Test: `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Produces: `PinConfig` type, `getPinConfig()`, `savePinConfig()`, `deletePinConfig()` functions

- [ ] **Step 1: Add PinConfig interface to types.ts**

```typescript
// Add to src/lib/types.ts

export interface PinConfig {
  pinHash: string;       // Base64 PBKDF2 output
  salt: string;          // Base64 random 16-byte salt
  iterations: number;    // 100000
  webAuthnCredential: {
    credentialId: string;
    publicKey: string;   // JWK format
    transports?: string[];
  } | null;
  isSetup: boolean;
}
```

- [ ] **Step 2: Add PinConfig message types to types.ts**

```typescript
// Add to src/lib/types.ts

export interface SetupPinMessage extends Message {
  action: 'SETUP_PIN';
  payload: { pin: string; credential: { credentialId: string; publicKey: string; transports?: string[] } };
}

export interface ResetPinMessage extends Message {
  action: 'RESET_PIN';
  payload: { oldPin: string; newPin: string; assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string } };
}

export interface RemovePinMessage extends Message {
  action: 'REMOVE_PIN';
  payload: { pin: string; assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string } };
}

export interface VerifyPinMessage extends Message {
  action: 'VERIFY_PIN';
  payload: { pin: string };
}

export interface AutofillWithPinMessage extends Message {
  action: 'AUTOFILL';
  payload: { accounts: Account[]; pinSetup: boolean };
}
```

- [ ] **Step 3: Add storage functions to storage.ts**

```typescript
// Add to src/lib/storage.ts

import type { PinConfig } from './types';

const PIN_CONFIG_KEY = 'pinConfig';

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
```

- [ ] **Step 4: Add tests for storage functions**

```typescript
// Add to src/lib/__tests__/storage.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPinConfig, savePinConfig, deletePinConfig } from '../storage';
import type { PinConfig } from '../types';

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
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- --run src/lib/__tests__/storage.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/storage.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: add PinConfig type and storage functions"
```

---

### Task 2: Implement PIN Hashing Library (PBKDF2)

**Files:**
- Create: `src/lib/pin.ts`
- Test: `src/lib/__tests__/pin.test.ts`

**Interfaces:**
- Produces: `derivePinHash(pin, salt, iterations)`, `verifyPin(pin, storedHash, salt, iterations)`, `generateSalt()` functions

- [ ] **Step 1: Write failing tests for pin.ts**

```typescript
// Create src/lib/__tests__/pin.test.ts

import { describe, it, expect } from 'vitest';
import { derivePinHash, verifyPin, generateSalt } from '../pin';

describe('pin.ts', () => {
  describe('generateSalt', () => {
    it('should return a Uint8Array of 16 bytes', () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate different salts on each call', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(Buffer.from(salt1)).not.toEqual(Buffer.from(salt2));
    });
  });

  describe('derivePinHash', () => {
    it('should return a base64 string', async () => {
      const salt = generateSalt();
      const hash = await derivePinHash('123456', salt, 100000);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      // Verify it's valid base64
      expect(() => atob(hash)).not.toThrow();
    });

    it('should produce same hash for same inputs', async () => {
      const salt = generateSalt();
      const hash1 = await derivePinHash('123456', salt, 100000);
      const hash2 = await derivePinHash('123456', salt, 100000);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different PINs', async () => {
      const salt = generateSalt();
      const hash1 = await derivePinHash('123456', salt, 100000);
      const hash2 = await derivePinHash('654321', salt, 100000);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash for different salts', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = await derivePinHash('123456', salt1, 100000);
      const hash2 = await derivePinHash('123456', salt2, 100000);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPin', () => {
    it('should return true for correct PIN', async () => {
      const salt = generateSalt();
      const hash = await derivePinHash('123456', salt, 100000);
      const result = await verifyPin('123456', hash, salt, 100000);
      expect(result).toBe(true);
    });

    it('should return false for incorrect PIN', async () => {
      const salt = generateSalt();
      const hash = await derivePinHash('123456', salt, 100000);
      const result = await verifyPin('654321', hash, salt, 100000);
      expect(result).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- --run src/lib/__tests__/pin.test.ts`
Expected: FAIL with "Cannot find module '../pin'"

- [ ] **Step 3: Implement pin.ts**

```typescript
// Create src/lib/pin.ts

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function derivePinHash(
  pin: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray));
}

export async function verifyPin(
  pin: string,
  storedHash: string,
  salt: Uint8Array,
  iterations: number
): Promise<boolean> {
  const derivedHash = await derivePinHash(pin, salt, iterations);
  return derivedHash === storedHash;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- --run src/lib/__tests__/pin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pin.ts src/lib/__tests__/pin.test.ts
git commit -m "feat: implement PBKDF2 PIN hashing library"
```

---

### Task 3: Implement WebAuthn Helpers

**Files:**
- Create: `src/lib/webauthn.ts`

**Interfaces:**
- Produces: `registerCredential()`, `authenticateCredential(credentialId)` functions

- [ ] **Step 1: Implement webauthn.ts**

```typescript
// Create src/lib/webauthn.ts

export interface WebAuthnCredential {
  credentialId: string;
  publicKey: string;
  transports?: string[];
}

export interface WebAuthnAssertion {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}

export async function registerCredential(): Promise<WebAuthnCredential> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Soft TOTP', id: chrome.runtime.id },
      user: {
        id: userId,
        name: 'softtotp-user',
        displayName: 'Soft TOTP User',
      },
      challenge,
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('WebAuthn registration failed');
  }

  const pubKeyCredential = credential as PublicKeyCredential;
  const response = pubKeyCredential.response as AuthenticatorAttestationResponse;

  return {
    credentialId: btoa(
      String.fromCharCode(...new Uint8Array(pubKeyCredential.rawId))
    ),
    publicKey: btoa(
      String.fromCharCode(...new Uint8Array(response.getPublicKey()!))
    ),
    transports: (response as any).getTransports?.() || [],
  };
}

export async function authenticateCredential(
  credentialId: string
): Promise<WebAuthnAssertion> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('WebAuthn authentication failed');
  }

  const pubKeyCredential = credential as PublicKeyCredential;
  const response = pubKeyCredential.response as AuthenticatorAssertionResponse;

  return {
    credentialId: btoa(
      String.fromCharCode(...new Uint8Array(pubKeyCredential.rawId))
    ),
    authenticatorData: btoa(
      String.fromCharCode(...new Uint8Array(response.authenticatorData))
    ),
    clientDataJSON: btoa(
      String.fromCharCode(...new Uint8Array(response.clientDataJSON))
    ),
    signature: btoa(
      String.fromCharCode(...new Uint8Array(response.signature))
    ),
  };
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/webauthn.ts
git commit -m "feat: implement WebAuthn registration and authentication helpers"
```

---

### Task 4: Background PIN Message Handlers

**Files:**
- Modify: `src/background/index.ts`

**Interfaces:**
- Consumes: `PinConfig`, `getPinConfig()`, `savePinConfig()`, `deletePinConfig()`, `derivePinHash()`, `verifyPin()`, `generateSalt()`
- Produces: Message handlers for `SETUP_PIN`, `RESET_PIN`, `REMOVE_PIN`, `VERIFY_PIN`, `GET_PIN_CONFIG`

- [ ] **Step 1: Add imports to background/index.ts**

```typescript
// Add to top of src/background/index.ts

import { getPinConfig, savePinConfig, deletePinConfig } from '../lib/storage';
import { derivePinHash, verifyPin, generateSalt } from '../lib/pin';
import type { PinConfig } from '../lib/types';
```

- [ ] **Step 2: Add GET_PIN_CONFIG handler**

```typescript
// Add inside chrome.runtime.onMessage.addListener callback in src/background/index.ts
// Before the existing if (message.action === 'SCAN_QR') block

if (message.action === 'GET_PIN_CONFIG') {
  getPinConfig().then((config) => {
    sendResponse({ config: config ? { isSetup: config.isSetup, webAuthnCredential: config.webAuthnCredential } : null });
  });
  return true;
}
```

- [ ] **Step 3: Add SETUP_PIN handler**

```typescript
// Add after GET_PIN_CONFIG handler

if (message.action === 'SETUP_PIN') {
  const { pin, credential } = message.payload as { pin: string; credential: { credentialId: string; publicKey: string; transports?: string[] } };

  (async () => {
    try {
      const salt = generateSalt();
      const pinHash = await derivePinHash(pin, salt, 100000);

      const config: PinConfig = {
        pinHash,
        salt: btoa(String.fromCharCode(...salt)),
        iterations: 100000,
        webAuthnCredential: credential,
        isSetup: true,
      };

      await savePinConfig(config);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true;
}
```

- [ ] **Step 4: Add VERIFY_PIN handler**

```typescript
// Add after SETUP_PIN handler

if (message.action === 'VERIFY_PIN') {
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
      sendResponse({ success: isValid });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true;
}
```

- [ ] **Step 5: Add RESET_PIN handler**

```typescript
// Add after VERIFY_PIN handler

if (message.action === 'RESET_PIN') {
  const { oldPin, newPin, assertion } = message.payload as {
    oldPin: string;
    newPin: string;
    assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string };
  };

  (async () => {
    try {
      const config = await getPinConfig();
      if (!config || !config.isSetup) {
        sendResponse({ success: false, error: 'PIN not configured' });
        return;
      }

      // Verify old PIN
      const salt = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
      const isOldPinValid = await verifyPin(oldPin, config.pinHash, salt, config.iterations);
      if (!isOldPinValid) {
        sendResponse({ success: false, error: 'Old PIN is incorrect' });
        return;
      }

      // Verify WebAuthn assertion
      if (!config.webAuthnCredential || config.webAuthnCredential.credentialId !== assertion.credentialId) {
        sendResponse({ success: false, error: 'WebAuthn credential mismatch' });
        return;
      }

      // Derive new hash
      const newSalt = generateSalt();
      const newPinHash = await derivePinHash(newPin, newSalt, 100000);

      const updatedConfig: PinConfig = {
        ...config,
        pinHash: newPinHash,
        salt: btoa(String.fromCharCode(...newSalt)),
      };

      await savePinConfig(updatedConfig);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true;
}
```

- [ ] **Step 6: Add REMOVE_PIN handler**

```typescript
// Add after RESET_PIN handler

if (message.action === 'REMOVE_PIN') {
  const { pin, assertion } = message.payload as {
    pin: string;
    assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string };
  };

  (async () => {
    try {
      const config = await getPinConfig();
      if (!config || !config.isSetup) {
        sendResponse({ success: false, error: 'PIN not configured' });
        return;
      }

      // Verify PIN
      const salt = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
      const isPinValid = await verifyPin(pin, config.pinHash, salt, config.iterations);
      if (!isPinValid) {
        sendResponse({ success: false, error: 'PIN is incorrect' });
        return;
      }

      // Verify WebAuthn assertion
      if (!config.webAuthnCredential || config.webAuthnCredential.credentialId !== assertion.credentialId) {
        sendResponse({ success: false, error: 'WebAuthn credential mismatch' });
        return;
      }

      await deletePinConfig();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true;
}
```

- [ ] **Step 7: Update AUTOFILL handler to include pinSetup flag**

```typescript
// Modify the webNavigation.onCompleted listener in src/background/index.ts

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab.url) return;

  const accounts = await getAccounts();
  const matchedAccounts = accounts.filter(
    (a) => a.urlPatterns?.some((pattern) => matchURL(pattern, tab.url!))
  );

  if (matchedAccounts.length === 0) return;

  const pinConfig = await getPinConfig();
  const pinSetup = pinConfig?.isSetup ?? false;

  chrome.tabs.sendMessage(details.tabId, {
    action: 'AUTOFILL',
    payload: { accounts: matchedAccounts, pinSetup },
  });
});
```

- [ ] **Step 8: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: add PIN message handlers to background service worker"
```

---

### Task 5: PIN Popup UI Component (Content Script)

**Files:**
- Create: `src/content/pin-popup.ts`

**Interfaces:**
- Produces: `showPinPopup(accounts, onVerified)` function
- Uses: Shadow DOM, glassmorphism CSS, gravity-bounce animation

- [ ] **Step 1: Implement pin-popup.ts**

```typescript
// Create src/content/pin-popup.ts

import type { Account } from '../lib/types';

interface PinPopupResult {
  success: boolean;
  selectedAccount?: Account;
}

export function showPinPopup(
  accounts: Account[],
  onVerified: (account: Account) => void,
  onDismiss: () => void
): void {
  const host = document.createElement('div');
  host.id = 'twofa-pin-host';
  host.style.cssText = 'position: fixed; top: 0; right: 0; z-index: 999999; pointer-events: none;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes twofa-drop {
      0% {
        transform: translate(100px, -100px) scale(0.6);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      60% {
        transform: translate(-8px, 6px) scale(1.05);
      }
      75% {
        transform: translate(3px, -2px) scale(0.98);
      }
      87% {
        transform: translate(-1px, 1px) scale(1.02);
      }
      100% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
      }
    }

    @keyframes twofa-backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes twofa-shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }

    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      opacity: 0;
      pointer-events: auto;
      animation: twofa-backdrop-in 0.4s ease-out 0.3s forwards;
    }

    .popup {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      padding: 24px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      pointer-events: auto;
      animation: twofa-drop 0.8s cubic-bezier(0.2, 0, 0, 1) forwards;
      opacity: 0;
    }

    .popup.error {
      animation: twofa-shake 0.4s ease-in-out;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 15px;
      font-weight: 500;
    }

    .header-icon {
      font-size: 18px;
    }

    .pin-inputs {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 16px;
    }

    .pin-input {
      width: 40px;
      height: 48px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      outline: none;
      transition: border-color 0.2s, background 0.2s;
      font-family: monospace;
    }

    .pin-input:focus {
      border-color: rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.2);
    }

    .pin-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .account-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 14px;
      margin-bottom: 16px;
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .account-select option {
      background: #1a1a2e;
      color: #fff;
    }

    .submit-btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .submit-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-msg {
      color: #ff6b6b;
      font-size: 13px;
      text-align: center;
      margin-top: 12px;
      min-height: 20px;
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }

    .close-btn:hover {
      color: #fff;
    }
  `;
  shadow.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.addEventListener('click', () => {
    host.remove();
    onDismiss();
  });

  const popup = document.createElement('div');
  popup.className = 'popup';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    host.remove();
    onDismiss();
  });

  // Header
  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = '<span class="header-icon">🔒</span> Nhập mã PIN để tự động fill';

  // PIN inputs
  const pinInputsContainer = document.createElement('div');
  pinInputsContainer.className = 'pin-inputs';

  const pinInputs: HTMLInputElement[] = [];
  for (let i = 0; i < 6; i++) {
    const input = document.createElement('input');
    input.className = 'pin-input';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 1;
    input.placeholder = '•';
    input.autocomplete = 'off';

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/[^0-9]/g, '');
      if (target.value && i < 5) {
        pinInputs[i + 1].focus();
      }
      updateSubmitState();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !pinInputs[i].value && i > 0) {
        pinInputs[i - 1].focus();
      }
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = e.clipboardData?.getData('text') || '';
      const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
      digits.split('').forEach((digit, idx) => {
        if (pinInputs[idx]) {
          pinInputs[idx].value = digit;
        }
      });
      if (digits.length > 0) {
        pinInputs[Math.min(digits.length, 5)].focus();
      }
      updateSubmitState();
    });

    pinInputs.push(input);
    pinInputsContainer.appendChild(input);
  }

  // Account select (if multiple)
  let selectedAccount = accounts[0];
  let accountSelect: HTMLSelectElement | null = null;

  if (accounts.length > 1) {
    accountSelect = document.createElement('select');
    accountSelect.className = 'account-select';

    accounts.forEach((account, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = `${account.name} (${account.issuer})`;
      accountSelect!.appendChild(option);
    });

    accountSelect.addEventListener('change', (e) => {
      const idx = parseInt((e.target as HTMLSelectElement).value);
      selectedAccount = accounts[idx];
    });
  }

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.className = 'submit-btn';
  submitBtn.textContent = 'Xác nhận';
  submitBtn.disabled = true;

  function updateSubmitState() {
    const allFilled = pinInputs.every((input) => input.value.length === 1);
    submitBtn.disabled = !allFilled;
  }

  // Error message
  const errorMsg = document.createElement('div');
  errorMsg.className = 'error-msg';

  submitBtn.addEventListener('click', async () => {
    const pin = pinInputs.map((input) => input.value).join('');
    if (pin.length !== 6) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xác thực...';
    errorMsg.textContent = '';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'VERIFY_PIN',
        payload: { pin },
      });

      if (response.success) {
        host.remove();
        onVerified(selectedAccount);
      } else {
        popup.classList.add('error');
        setTimeout(() => popup.classList.remove('error'), 400);
        errorMsg.textContent = '❌ Sai mã PIN, thử lại';
        pinInputs.forEach((input) => {
          input.value = '';
        });
        pinInputs[0].focus();
      }
    } catch (err) {
      errorMsg.textContent = '❌ Lỗi xác thực, thử lại';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận';
      updateSubmitState();
    }
  });

  // Assemble popup
  popup.appendChild(closeBtn);
  popup.appendChild(header);
  popup.appendChild(pinInputsContainer);
  if (accountSelect) {
    popup.appendChild(accountSelect);
  }
  popup.appendChild(submitBtn);
  popup.appendChild(errorMsg);

  shadow.appendChild(backdrop);
  shadow.appendChild(popup);

  // Focus first input after animation
  setTimeout(() => {
    pinInputs[0].focus();
  }, 800);
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/pin-popup.ts
git commit -m "feat: implement PIN popup UI with glassmorphism and gravity-bounce animation"
```

---

### Task 6: Integrate PIN Check into Autofill Flow

**Files:**
- Modify: `src/content/index.ts`
- Modify: `src/content/autofill.ts`

**Interfaces:**
- Consumes: `showPinPopup()` from pin-popup.ts, `handleAutofill()` from autofill.ts
- Produces: Updated autofill flow with PIN gate

- [ ] **Step 1: Update content/index.ts to handle pinSetup flag**

```typescript
// Replace src/content/index.ts

import { startQRCapture } from './qr-capture';
import { handleAutofill } from './autofill';
import { showPinPopup } from './pin-popup';
import type { Account } from '../lib/types';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'SCAN_QR') {
    startQRCapture();
  }

  if (message.action === 'AUTOFILL') {
    const accounts = message.payload?.accounts as Account[];
    const pinSetup = message.payload?.pinSetup as boolean;

    if (!accounts || accounts.length === 0) return;

    if (pinSetup) {
      showPinPopup(
        accounts,
        (selectedAccount) => {
          handleAutofill([selectedAccount]);
        },
        () => {
          // User dismissed popup — do nothing
        }
      );
    } else {
      handleAutofill(accounts);
    }
  }
});
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: integrate PIN popup into autofill flow"
```

---

### Task 7: PinSettings UI for Options Page

**Files:**
- Create: `src/options/PinSettings.tsx`
- Modify: `src/options/App.tsx`

**Interfaces:**
- Consumes: `registerCredential()`, `authenticateCredential()` from webauthn.ts
- Produces: `PinSettings` React component

- [ ] **Step 1: Implement PinSettings.tsx**

```tsx
// Create src/options/PinSettings.tsx

import { useState, useEffect } from 'react';
import { registerCredential, authenticateCredential } from '../lib/webauthn';
import { colors } from '../lib/colors';

interface PinSettingsProps {
  onPinStatusChange?: (isSetup: boolean) => void;
}

export function PinSettings({ onPinStatusChange }: PinSettingsProps) {
  const [isSetup, setIsSetup] = useState(false);
  const [mode, setMode] = useState<'idle' | 'setup' | 'change' | 'remove'>('idle');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'GET_PIN_CONFIG' });
    const setup = response?.config?.isSetup ?? false;
    setIsSetup(setup);
    onPinStatusChange?.(setup);
  };

  const resetForm = () => {
    setPin('');
    setConfirmPin('');
    setOldPin('');
    setError('');
    setSuccess('');
    setMode('idle');
  };

  const handleSetup = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN phải gồm 6 chữ số');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await registerCredential();
      const response = await chrome.runtime.sendMessage({
        action: 'SETUP_PIN',
        payload: { pin, credential },
      });

      if (response.success) {
        setSuccess('PIN đã được tạo thành công');
        setIsSetup(true);
        onPinStatusChange?.(true);
        setTimeout(resetForm, 2000);
      } else {
        setError(response.error || 'Lỗi tạo PIN');
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi đăng ký sinh trắc học');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async () => {
    if (oldPin.length !== 6) {
      setError('Nhập PIN hiện tại');
      return;
    }
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN mới phải gồm 6 chữ số');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN mới không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const assertion = await authenticateCredential('');
      const response = await chrome.runtime.sendMessage({
        action: 'RESET_PIN',
        payload: { oldPin, newPin: pin, assertion },
      });

      if (response.success) {
        setSuccess('PIN đã được cập nhật');
        setTimeout(resetForm, 2000);
      } else {
        setError(response.error || 'Lỗi cập nhật PIN');
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi xác thực sinh trắc học');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (pin.length !== 6) {
      setError('Nhập PIN hiện tại');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const assertion = await authenticateCredential('');
      const response = await chrome.runtime.sendMessage({
        action: 'REMOVE_PIN',
        payload: { pin, assertion },
      });

      if (response.success) {
        setSuccess('PIN đã được xóa');
        setIsSetup(false);
        onPinStatusChange?.(false);
        setTimeout(resetForm, 2000);
      } else {
        setError(response.error || 'Lỗi xóa PIN');
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi xác thực sinh trắc học');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'monospace',
    letterSpacing: '8px',
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid ${colors.border}`,
    }}>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: 600,
        color: colors.textPrimary,
      }}>
        🔒 PIN Security
      </h2>

      {mode === 'idle' && (
        <div>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
            {isSetup
              ? 'PIN đang được bật. TOTP autofill sẽ yêu cầu PIN trước khi fill.'
              : 'PIN chưa được thiết lập. TOTP autofill sẽ fill tự động.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isSetup ? (
              <button
                onClick={() => setMode('setup')}
                style={{ ...btnStyle, background: colors.primary, color: '#fff' }}
              >
                Tạo PIN
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode('change')}
                  style={{ ...btnStyle, background: colors.primaryLight, color: '#fff' }}
                >
                  Đổi PIN
                </button>
                <button
                  onClick={() => setMode('remove')}
                  style={{ ...btnStyle, background: colors.error, color: '#fff' }}
                >
                  Xóa PIN
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập PIN 6 số"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập lại PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSetup}
              disabled={loading}
              style={{ ...btnStyle, background: colors.primary, color: '#fff' }}
            >
              {loading ? 'Đang tạo...' : 'Tạo PIN'}
            </button>
            <button
              onClick={resetForm}
              style={{ ...btnStyle, background: colors.borderLight, color: colors.textPrimary }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {mode === 'change' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN hiện tại"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN mới"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập lại PIN mới"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleChange}
              disabled={loading}
              style={{ ...btnStyle, background: colors.primary, color: '#fff' }}
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
            <button
              onClick={resetForm}
              style={{ ...btnStyle, background: colors.borderLight, color: colors.textPrimary }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {mode === 'remove' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: colors.error, fontSize: '14px', margin: 0 }}>
            ⚠️ Xóa PIN sẽ tắt bảo mật cho autofill
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập PIN hiện tại"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRemove}
              disabled={loading}
              style={{ ...btnStyle, background: colors.error, color: '#fff' }}
            >
              {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
            <button
              onClick={resetForm}
              style={{ ...btnStyle, background: colors.borderLight, color: colors.textPrimary }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: colors.error, fontSize: '14px', marginTop: '12px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: colors.success, fontSize: '14px', marginTop: '12px' }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add PinSettings to options/App.tsx**

```typescript
// Add import at top of src/options/App.tsx
import { PinSettings } from './PinSettings';

// Add <PinSettings /> inside the return JSX, before the accounts list
// After the header div, before the accounts section
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/options/PinSettings.tsx src/options/App.tsx
git commit -m "feat: add PIN settings UI to options page"
```

---

### Task 8: Build Verification and Manual Testing

**Files:** None (verification only)

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 4: Manual test checklist**

1. Load extension in Chrome (`chrome://extensions` → Load unpacked)
2. Open Options page → PIN Security section should show "Tạo PIN" button
3. Click "Tạo PIN" → Enter 6 digits → Confirm → WebAuthn popup should appear
4. After biometric → PIN created successfully
5. Add a test account with URL pattern
6. Navigate to matched URL → PIN popup should appear with gravity-bounce animation
7. Enter wrong PIN → Error message, shake animation, inputs reset
8. Enter correct PIN → TOTP auto-fills
9. Close/dismiss popup → No autofill
10. Options page → Change PIN → Verify old PIN + WebAuthn → New PIN works
11. Options page → Remove PIN → Verify PIN + WebAuthn → PIN removed
12. Navigate to matched URL → No PIN popup, auto-fill works directly

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address manual testing feedback"
```
