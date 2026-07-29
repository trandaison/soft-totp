# Predefined Autofill Rules — Design Spec

## Overview

Add a predefined JSON file (`autofill-rules.json`) to the repo root that maps URL patterns to MFA input selectors. The extension fetches this file once on startup and caches in memory. When an account has no custom `mfaInputSelector`, the extension looks up the predefined rules by matching the current URL. This eliminates the need for users to manually configure CSS selectors.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data source | JSON file in repo root, fetched from GitHub raw URL | Easy to update via PR, no release/build needed |
| Key structure | URL pattern → `mfaInputSelector` | Direct mapping, supports multiple pages per service |
| Cache strategy | Fetch once on service worker start, cache in memory | Simple, resets on browser restart (acceptable) |
| Error handling | Silently fall back to default selectors | Non-intrusive, extension works without predefined data |
| Priority | User custom `mfaInputSelector` on account > predefined rules | User overrides always win |
| Root key | `autofillRules` | Descriptive, matches feature name |
| Matching | Reuse existing `matchURL()` from `url-match.ts` | Consistent URL matching logic |

## Data Model

### `autofill-rules.json` (repo root)

```json
{
  "autofillRules": {
    "slack.com": { "mfaInputSelector": "input[data-testid='mfa-code-input']" },
    "github.com/sessions/two-factor": { "mfaInputSelector": "input[name='otp']" },
    "accounts.google.com/signin/challenge/*": { "mfaInputSelector": "input[id='totpPin']" }
  }
}
```

- **Key**: URL pattern (same format as `Account.urlPatterns`, matched by `matchURL()`)
- **Value**: Object with `mfaInputSelector` field
- Extensible — can add more fields later (e.g., `autoSubmit`)

### Module: `src/lib/autofill-rules.ts`

```typescript
// In-memory cache (module-level)
let cachedRules: Record<string, { mfaInputSelector: string }> | null = null;

// Fetch from GitHub, called once on service worker startup
export async function fetchAutofillRules(): Promise<void>;

// Look up mfaInputSelector for a given URL
// Iterates cached rules, uses matchURL() to find first match
export function getMfaSelector(url: string): string | null;
```

- `fetchAutofillRules()` fetches from `https://raw.githubusercontent.com/trandaison/soft-totp/refs/heads/main/autofill-rules.json`
- On fetch failure: `cachedRules` stays null, no crash, no retry
- `getMfaSelector()` returns first matching `mfaInputSelector` or `null`

## Autofill Flow (Updated)

```
Service worker start:
  → fetchAutofillRules()  // fetch once, cache in memory

WebNavigation.onCompleted:
  → getAccounts() → filter by URL match
  → For each matched account:
      - If account has mfaInputSelector → use it (user custom)
      - If not → call getMfaSelector(tab.url) → use predefined
      - Attach resolved selector to account in message payload
  → sendMessage(tabId, { action: 'AUTOFILL', payload: { accounts } })

Content script:
  → handleAutofill(accounts)  // unchanged — uses findMFAInput()
```

- `Account` type unchanged — selector resolved at runtime in background
- Content script unaware of selector source

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `autofill-rules.json` | Predefined URL pattern → MFA selector mappings |
| `src/lib/autofill-rules.ts` | Fetch, cache, and lookup logic |

### Modified Files

| File | Changes |
|------|---------|
| `src/background/index.ts` | Call `fetchAutofillRules()` on start, resolve selectors before sending message |
| `manifest.json` | No changes needed (fetch is in service worker, no new permissions) |

## Error Handling

| Scenario | Handling |
|----------|----------|
| GitHub down / offline | `cachedRules` stays null, fall back to default selectors |
| Invalid JSON | Parse error caught, same as fetch failure |
| No matching rule for URL | `getMfaSelector()` returns null, fall back to default selectors |
| Extension update | Rules refetch on next service worker start |

## Testing

- Unit test `autofill-rules.ts`: mock `fetch`, test `fetchAutofillRules()` success/failure, test `getMfaSelector()` with matching/non-matching URLs
- Integration test: background script resolves predefined selector for account without custom selector
