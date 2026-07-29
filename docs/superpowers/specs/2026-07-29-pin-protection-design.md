# PIN Protection for TOTP Autofill — Design Spec

## Overview

Add a 6-digit PIN (soft TOTP) layer to protect TOTP auto-fill on matched pages. PIN is hashed with PBKDF2, stored client-side. WebAuthn biometric required for setup and reset. Popup appears on content script with glassmorphism UI and gravity-bounce animation.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PIN hashing | PBKDF2-SHA256, 100k iterations, 16-byte salt | OWASP recommendation for client-side |
| PIN storage | Hash only (non-reversible) in `chrome.storage.local` | Attacker cannot recover PIN from storage |
| Verification | Background service worker | Content script runs in website context — security risk |
| WebAuthn | Platform authenticator only (`authenticatorAttachment: 'platform'`) | Built-in biometric (Touch ID, Face ID, Windows Hello) |
| Session | No session — PIN required on every autofill trigger | Maximum security, no cached state |
| UI style | Glassmorphism with Shadow DOM isolation | Premium look, CSS isolation from host website |
| Animation | Gravity bounce from top-right corner | Physics-based, natural feel |

## Architecture

### Data Model

```typescript
// src/lib/types.ts — add PinConfig
interface PinConfig {
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

### Message Protocol

| Action | Direction | Payload | Description |
|--------|-----------|---------|-------------|
| `SETUP_PIN` | popup→bg | `{ pin, credential }` | Create PIN + register WebAuthn |
| `RESET_PIN` | popup→bg | `{ oldPin, newPin, assertion }` | Reset: verify old PIN + WebAuthn |
| `REMOVE_PIN` | popup→bg | `{ pin, assertion }` | Remove PIN protection |
| `GET_PIN_CONFIG` | any→bg | — | Get config (hash not exposed) |
| `VERIFY_PIN` | content→bg | `{ pin }` | Verify PIN, returns `{ success }` |
| `AUTOFILL_WITH_PIN` | bg→content | `{ accounts, pinSetup }` | Trigger autofill with PIN flag |

### Autofill Flow (Updated)

```
Background (webNavigation.onCompleted):
  → getAccounts() → match URL
  → getPinConfig()
  → sendMessage(tabId, { action: 'AUTOFILL', payload: { accounts, pinSetup: config.isSetup } })

Content script:
  if (pinSetup) {
    → render PIN popup (glassmorphism, gravity-bounce animation)
    → user enters PIN → send VERIFY_PIN → background
    → background derives PBKDF2 hash, compares with stored hash
    → returns { success }
    → if success → autofill TOTP code (existing logic)
    → if fail → show error, reset input fields
    → if user closes/dismisses popup → close popup, no autofill, user skips
  } else {
    → autofill directly (existing behavior)
  }
```

### PIN Setup Flow (Options Page)

1. User clicks "Setup PIN" on Options page
2. Form: enter PIN 6 digits + confirm PIN
3. Click "Create" → validate PINs match
4. WebAuthn registration popup (`navigator.credentials.create`)
5. On success → generate random salt, derive PBKDF2 hash, save `PinConfig`
6. Show success notification

### PIN Reset Flow (Options Page)

1. User clicks "Change PIN" on Options page
2. Form: enter old PIN + new PIN + confirm new PIN
3. Click "Update" → verify old PIN first
4. If old PIN correct → WebAuthn authentication (`navigator.credentials.get`)
5. If both OK → derive new hash, update `PinConfig`
6. Show success notification

### PIN Remove Flow (Options Page)

1. User clicks "Remove PIN" (confirmation dialog)
2. Require current PIN + WebAuthn
3. If OK → delete `PinConfig`, set `isSetup: false`

## PIN Popup UI (Content Script)

### Structure

```
┌─────────────────────────────────┐
│  🔒  Nhập mã PIN để tự động fill  │
│                                 │
│  ┌───┬───┬───┬───┬───┬───┐     │
│  │ _ │ _ │ _ │ _ │ _ │ _ │     │  ← 6 digit inputs
│  └───┴───┴───┴───┴───┴───┘     │
│                                 │
│  [Select account ▼]             │  ← if multiple accounts
│                                 │
│         [ Xác nhận ]            │
│                                 │
│  ❌ Sai mã PIN, thử lại         │  ← error (hidden by default)
└─────────────────────────────────┘
```

### Glassmorphism Style

- Background: `rgba(255, 255, 255, 0.15)` + `backdrop-filter: blur(20px) saturate(180%)`
- Border: `1px solid rgba(255, 255, 255, 0.2)`
- Box shadow: `0 8px 32px rgba(0, 0, 0, 0.3)`
- Border radius: `16px`
- Text: white, `font-family: system-ui, -apple-system, sans-serif`
- Rendered inside Shadow DOM (`mode: 'closed'`) for CSS isolation

### Gravity-Bounce Animation

- **Phase 1 (0→400ms):** Drop from top-right with gravity acceleration
  - `cubic-bezier(0.55, 0, 1, 0.45)` (gravity easing)
  - `translateY: -100px → 0`, `translateX: 100px → 0`
  - `scale: 0.6 → 1.05` (overshoot)
- **Phase 2 (400→600ms):** Bounce settle
  - `cubic-bezier(0.2, 0, 0, 1)`
  - `scale: 1.05 → 1.0`
- **Phase 3 (600→800ms):** Micro-bounce (optional)
  - `scale: 1.02 → 1.0`
- **Backdrop:** Fade-in starts at 300ms (after popup nearly settled), duration 400ms

### Position

- `position: fixed; top: 20px; right: 20px; z-index: 999999`

### Multiple Accounts

- If 1 account: PIN input + submit only
- If > 1 account: selectbox below PIN input, label "Chọn tài khoản"
- Selectbox displays: `{account.name} ({account.issuer})`
- Default: first account selected

## Security: PIN Hashing (PBKDF2)

```
deriveHash(pin, salt, iterations):
  keyMaterial = crypto.subtle.importKey("raw", pin, "PBKDF2", false, ["deriveBits"])
  bits = crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, 256)
  return base64Encode(bits)
```

- Salt: 16 bytes from `crypto.getRandomValues()`
- Iterations: 100,000
- Output: 256-bit hash

## WebAuthn

### Registration (Setup PIN)

```javascript
navigator.credentials.create({
  publicKey: {
    rp: { name: "Soft TOTP", id: chrome.runtime.id },
    user: { id: randomUserId, name: "softtotp-user", displayName: "Soft TOTP User" },
    challenge: randomChallenge,
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    }
  }
})
```

### Authentication (Reset/Remove PIN)

```javascript
navigator.credentials.get({
  publicKey: {
    challenge: randomChallenge,
    allowCredentials: [{ id: credentialId, type: "public-key", transports: ["internal"] }],
    userVerification: "required"
  }
})
```

- `authenticatorAttachment: 'platform'` ensures built-in biometric only
- Challenge generated fresh by background service worker each time

## Error Handling

| Scenario | Handling |
|----------|----------|
| Wrong PIN | Show error message, reset input fields, allow retry |
| User closes/dismisses popup | Close popup, no autofill — user skips this page |
| WebAuthn cancelled by user | Show "Cần xác thực vân tay để tiếp tục", allow retry |
| WebAuthn not available | Show "Thiết bị không hỗ trợ sinh trắc học", block PIN setup |
| WebAuthn timeout | Auto-retry or show error |
| Storage cleared | Reset `isSetup: false`, existing accounts preserved |
| Extension update | `PinConfig` persists in storage |
| CSP blocks content script | Popup renders in Shadow DOM (existing pattern in autofill.ts) |

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/lib/pin.ts` | PBKDF2 hashing, verify, salt generation |
| `src/lib/webauthn.ts` | WebAuthn registration + authentication helpers |
| `src/content/pin-popup.ts` | PIN popup component (glassmorphism, animation) |
| `src/options/PinSettings.tsx` | PIN setup/reset/remove UI in Options page |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `PinConfig` interface |
| `src/lib/storage.ts` | Add `getPinConfig()`, `savePinConfig()`, `deletePinConfig()` |
| `src/background/index.ts` | Handle PIN messages, verify PIN, WebAuthn challenge |
| `src/content/index.ts` | Add `AUTOFILL_WITH_PIN` handler |
| `src/content/autofill.ts` | Check `pinSetup` before autofill |
| `src/options/App.tsx` | Add `PinSettings` component |

## Testing

- Unit tests for `pin.ts`: PBKDF2 hash derivation, verify correct/incorrect PIN
- Unit tests for `webauthn.ts`: mock `navigator.credentials` API
- Integration test: setup PIN → verify → autofill flow
- E2E: manual testing on real sites with biometric hardware
