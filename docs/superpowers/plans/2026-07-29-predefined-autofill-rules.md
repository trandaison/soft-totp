# Predefined Autofill Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add predefined URL-to-MFA-selector mappings so users don't need to manually configure CSS selectors for common services.

**Architecture:** A JSON file in repo root maps URL patterns to MFA input selectors. Extension fetches once on service worker start, caches in memory. Background script resolves selectors before sending autofill messages.

**Tech Stack:** TypeScript, Vitest, Chrome Extension APIs

## Global Constraints

- Reuse existing `matchURL()` from `src/lib/url-match.ts` for URL matching
- User custom `mfaInputSelector` on account always takes priority over predefined rules
- Fetch from `https://raw.githubusercontent.com/trandaison/soft-totp/refs/heads/main/autofill-rules.json`
- Silent failure on fetch errors — extension works without predefined data
- No changes to `Account` type

---

### Task 1: Create `autofill-rules.json` with sample data

**Files:**
- Create: `autofill-rules.json`

**Interfaces:**
- Produces: JSON file with `autofillRules` root key, URL patterns as keys

- [ ] **Step 1: Create the JSON file**

```json
{
  "autofillRules": {
    "github.com/sessions/two-factor": {
      "mfaInputSelector": "input[name='otp']"
    },
    "accounts.google.com/signin/challenge/*": {
      "mfaInputSelector": "input[id='totpPin']"
    }
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('autofill-rules.json', 'utf8')); console.log('Valid JSON')"`

- [ ] **Step 3: Commit**

```bash
git add autofill-rules.json
git commit -m "feat: add predefined autofill rules JSON"
```

---

### Task 2: Create `src/lib/autofill-rules.ts` module

**Files:**
- Create: `src/lib/autofill-rules.ts`
- Create: `src/lib/__tests__/autofill-rules.test.ts`

**Interfaces:**
- Consumes: `matchURL` from `src/lib/url-match.ts`
- Produces: `fetchAutofillRules(): Promise<void>`, `getMfaSelector(url: string): string | null`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/autofill-rules.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAutofillRules, getMfaSelector } from '../autofill-rules';

describe('autofill-rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMfaSelector', () => {
    it('returns null when no rules loaded', () => {
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });

    it('returns null when URL does not match any rule', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          autofillRules: {
            'github.com/sessions/two-factor': { mfaInputSelector: "input[name='otp']" }
          }
        })
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://example.com')).toBeNull();
    });

    it('returns mfaInputSelector when URL matches', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          autofillRules: {
            'github.com/sessions/two-factor': { mfaInputSelector: "input[name='otp']" }
          }
        })
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBe("input[name='otp']");
    });

    it('matches wildcard patterns', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          autofillRules: {
            'accounts.google.com/signin/challenge/*': { mfaInputSelector: "input[id='totpPin']" }
          }
        })
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://accounts.google.com/signin/challenge/12345')).toBe("input[id='totpPin']");
    });
  });

  describe('fetchAutofillRules', () => {
    it('handles fetch failure silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });

    it('handles invalid JSON silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });

    it('handles non-ok response silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/autofill-rules.test.ts`
Expected: FAIL with "Cannot find module '../autofill-rules'"

- [ ] **Step 3: Implement the module**

```typescript
// src/lib/autofill-rules.ts
import { matchURL } from './url-match';

const FETCH_URL = 'https://raw.githubusercontent.com/trandaison/soft-totp/refs/heads/main/autofill-rules.json';

let cachedRules: Record<string, { mfaInputSelector: string }> | null = null;

export async function fetchAutofillRules(): Promise<void> {
  try {
    const response = await fetch(FETCH_URL);
    if (!response.ok) return;
    const data = await response.json();
    if (data && typeof data.autofillRules === 'object') {
      cachedRules = data.autofillRules;
    }
  } catch {
    // Silent failure — cachedRules stays null
  }
}

export function getMfaSelector(url: string): string | null {
  if (!cachedRules) return null;
  for (const [pattern, config] of Object.entries(cachedRules)) {
    if (matchURL(pattern, url)) {
      return config.mfaInputSelector;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/autofill-rules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/autofill-rules.ts src/lib/__tests__/autofill-rules.test.ts
git commit -m "feat: add autofill rules fetch and lookup module"
```

---

### Task 3: Integrate into background script

**Files:**
- Modify: `src/background/index.ts`

**Interfaces:**
- Consumes: `fetchAutofillRules`, `getMfaSelector` from `src/lib/autofill-rules.ts`

- [ ] **Step 1: Add import**

```typescript
// Add to imports in src/background/index.ts
import { fetchAutofillRules, getMfaSelector } from '../lib/autofill-rules';
```

- [ ] **Step 2: Call fetchAutofillRules on startup**

```typescript
// Add near top of src/background/index.ts, before any listeners
fetchAutofillRules();
```

- [ ] **Step 3: Resolve predefined selectors in webNavigation listener**

Replace the existing `webNavigation.onCompleted` listener with:

```typescript
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const tab = await chrome.tabs.get(details.tabId);
  if (!tab.url) return;

  const accounts = await getAccounts();
  const matchedAccounts = accounts
    .filter((a) => a.urlPatterns?.some((pattern) => matchURL(pattern, tab.url!)))
    .map((account) => {
      // User custom takes priority; fall back to predefined
      if (account.mfaInputSelector) return account;
      const predefinedSelector = getMfaSelector(tab.url!);
      if (predefinedSelector) {
        return { ...account, mfaInputSelector: predefinedSelector };
      }
      return account;
    });

  if (matchedAccounts.length === 0) return;

  const pinConfig = await getPinConfig();
  const pinSetup = pinConfig?.isSetup ?? false;

  const message = {
    action: 'AUTOFILL',
    payload: { accounts: matchedAccounts, pinSetup },
  };

  // Retry up to 5 times with 200ms delay
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await chrome.tabs.sendMessage(details.tabId, message);
      return;
    } catch {
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
});
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: integrate predefined autofill rules into background script"
```
