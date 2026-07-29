# Options & Popup PIN Gate Redesign

## Overview

Restructure the extension's Options page into a sidebar layout and add PIN protection to both the Options page and the Popup. Remove account management from Options (popup-only). Implement a shared unlock state with a 10-second grace period.

## Requirements

### Options Page
- Remove account list (`AccountEditor`) from Options page
- New sidebar layout with 3 subpages:
  1. **Autofill Rules** — existing `AutofillRulesDebug` component
  2. **Security** — existing `PinSettings` component (create/change/remove PIN)
  3. **Import & Export** — existing Import/Export buttons
- Full-page PIN login screen when PIN is set up and not yet unlocked
- If PIN is not set up, access Options normally without PIN prompt

### Popup
- When PIN is set up: show PIN form, completely hide account list until unlocked
- When PIN is not set up: show accounts normally
- Grace period: 10 seconds after popup closes (counted from browser close event)
- Within grace period: reopen popup without PIN
- After grace period: require PIN again

### Shared Unlock State
- Popup and Options share the same unlock state
- Unlocking one unlocks the other (within grace period)

---

## Architecture

### 1. Shared Unlock State (Background-managed)

**Storage key:** `unlockState` in `chrome.storage.local`

```typescript
interface UnlockState {
  unlockedUntil: number; // timestamp in ms, 0 = locked
}
```

**Grace period:** 10 seconds (`10000` ms)

**New message handlers in `src/background/index.ts`:**

| Message | Payload | Response | Behavior |
|---------|---------|----------|----------|
| `CHECK_UNLOCK` | none | `{ unlocked: boolean, pinSetup: boolean }` | Read `unlockState` + `pinConfig`, compare `unlockedUntil` with `Date.now()` |
| `RECORD_UNLOCK` | none | `{ success: boolean }` | Write `unlockedUntil = Date.now() + 10000` |
| `DO_UNLOCK` | `{ pin: string }` | `{ success: boolean, error?: string }` | Verify PIN, if correct write `unlockedUntil = Infinity` |

**Popup close detection:** Use `chrome.runtime.connect()` port. When port disconnects (popup closes), background writes `unlockedUntil = Date.now() + 10000`.

**Unlock lifecycle:**
1. User opens popup/options → `CHECK_UNLOCK`
2. If locked → show PIN form
3. User enters correct PIN → `DO_UNLOCK` → `unlockedUntil = Infinity`
4. User closes popup → port disconnect → `unlockedUntil = Date.now() + 10000`
5. Reopen within 10s → `CHECK_UNLOCK` returns `unlocked = true`
6. After 10s → `CHECK_UNLOCK` returns `unlocked = false`

### 2. Options Page — Sidebar Layout

**File structure:**
- `src/options/App.tsx` — rewrite with sidebar + content area + PIN gate
- `src/options/Sidebar.tsx` — new component for sidebar navigation
- `src/options/PinLogin.tsx` — new component for full-page PIN login
- Keep existing: `AutofillRulesDebug.tsx`, `PinSettings.tsx`

**Layout:**
```
┌──────────────────────────────────────────────┐
│  Soft TOTP                            header │
├───────────┬──────────────────────────────────┤
│  Sidebar  │  Content area                    │
│           │                                  │
│  Rules    │  (renders active subpage)        │
│  Security │                                  │
│  Import   │                                  │
│           │                                  │
└───────────┴──────────────────────────────────┘
```

**Subpages:**
1. **Autofill Rules** — renders `<AutofillRulesDebug />`
2. **Security** — renders `<PinSettings />`
3. **Import & Export** — renders Import/Export buttons (extracted from current `App.tsx`)

**PIN gate flow:**
1. On mount, send `CHECK_UNLOCK` to background
2. If `pinSetup = false` → render sidebar layout directly
3. If `pinSetup = true` + `unlocked = true` → render sidebar layout
4. If `pinSetup = true` + `unlocked = false` → render `<PinLogin />`
5. On successful PIN entry → render sidebar layout

**Removed from Options:**
- `AccountEditor` component usage
- Account list display
- `loadAccounts`, `handleUpdate`, `handleDelete`, `handleReorder` logic

### 3. Popup PIN Gate

**Changes to `src/popup/App.tsx`:**
- On mount, send `CHECK_UNLOCK` to background
- If locked: render PIN input form instead of account list
- If unlocked: render normal account list
- On component unmount / `beforeunload`: send `RECORD_UNLOCK` (or use port disconnect)

**PIN form component:** `src/popup/PinGate.tsx`
- 6-digit numeric input (reuse style from `pin-popup.ts`)
- Auto-submit on 6 digits
- Shake animation on wrong PIN
- Error display via red borders

**Grace period trigger:**
- Use `chrome.runtime.connect({ name: 'popup' })` on popup open
- Background listens for port `disconnect` event → writes `unlockedUntil = Date.now() + 10000`
- No need for `beforeunload` or explicit `RECORD_UNLOCK` message

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/background/index.ts` | Modify | Add `CHECK_UNLOCK`, `DO_UNLOCK` handlers; add port-based disconnect listener for grace period |
| `src/options/App.tsx` | Rewrite | Sidebar layout + PIN gate |
| `src/options/Sidebar.tsx` | Create | Sidebar navigation component |
| `src/options/PinLogin.tsx` | Create | Full-page PIN login form |
| `src/options/main.tsx` | No change | — |
| `src/popup/App.tsx` | Modify | Add PIN gate logic, add port connect for grace period |
| `src/popup/PinGate.tsx` | Create | PIN input form for popup |
| `src/lib/types.ts` | Modify | Add `CHECK_UNLOCK`, `DO_UNLOCK` message types |
| `src/lib/storage.ts` | Modify | Add `getUnlockState()`, `saveUnlockState()` helpers |

**Unchanged:** `PinSettings.tsx`, `AutofillRulesDebug.tsx`, `AccountCard.tsx`, `AccountList.tsx`, `AccountEditor.tsx`, `pin-popup.ts`, `autofill.ts`, content scripts.

---

## Edge Cases

1. **PIN not set up:** Both popup and options work normally, no PIN prompt.
2. **Popup opens during grace period:** No PIN required, full access.
3. **Options opens during grace period:** No PIN required, full access.
4. **Options already open when grace period expires:** Does not re-lock (only re-locks on next open).
5. **Multiple popup opens within 10s:** Grace period resets from each close.
6. **`handleScanQR` calls `window.close()`:** Port disconnect fires naturally, grace period starts.
