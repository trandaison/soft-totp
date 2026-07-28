# 2FA Extension Design Spec

## Overview

Chrome Extension quản lý mã MFA/2FA (TOTP). Hỗ trợ quét QR code bằng drag-select vùng màn hình, auto-fill mã khi detect URL match, và quản lý accounts qua popup/options page.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Build | Vite + CRXJS (HMR, auto-reload) |
| Language | TypeScript |
| UI | React (Popup + Options) |
| TOTP | otpauth library (RFC 6238) |
| QR Decode | jsQR |
| QR Capture | chrome.tabs.captureVisibleTab() + crop |
| Storage | chrome.storage.local (no encryption) |

## Project Structure

```
2fa-ext/
├── src/
│   ├── popup/                 # React popup UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── options/               # React options page
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── background/            # Service worker (MV3)
│   │   └── index.ts
│   ├── content/               # Content script
│   │   ├── index.ts           # Entry point, message listener
│   │   ├── qr-capture.ts      # Drag-select region → screenshot → decode QR
│   │   ├── overlay.ts         # Overlay UI for drag-select
│   │   └── autofill.ts        # Auto-fill MFA code + floating status icon
│   ├── lib/                   # Shared logic
│   │   ├── totp.ts            # TOTP generation
│   │   ├── storage.ts         # chrome.storage wrapper
│   │   ├── qr.ts              # QR decode + otpauth:// URI parsing
│   │   ├── url-match.ts       # URL pattern matching (glob)
│   │   └── types.ts           # TypeScript interfaces
│   └── assets/                # Icons, static files
├── manifest.json              # Chrome Extension MV3 manifest
├── vite.config.ts             # Vite + CRXJS config
├── tsconfig.json
├── package.json
└── README.md
```

## Data Model

```typescript
interface Account {
  id: string;                  // uuid
  name: string;                // "Slack", "GitHub", etc.
  issuer: string;              // Issuer from QR (optional)
  secret: string;              // Base32 secret
  urlPattern?: string;         // "slack.com", "github.com/login*", etc.
  mfaInputSelector?: string;   // CSS selector for MFA input field
  createdAt: number;
  sortOrder: number;
}
```

## Features

### 1. Popup — Account List

- Danh sách accounts với mã TOTP hiện tại
- Countdown ring (SVG circular progress) hiển thị thời gian còn lại
- Click vào mã → copy to clipboard
- Button "Add Account" → mở form nhập thủ công hoặc quét QR
- Drag to reorder accounts

### 2. Options Page — Account Management

- CRUD accounts (add, edit, delete)
- Sắp xếp accounts (drag-to-reorder)
- Export accounts (plain JSON file)
- Import accounts từ file
- Cài đặt: auto-fill toggle, default behavior

### 3. QR Code Capture

**Trigger:** User click "Scan QR" trong popup

**Flow:**
```
Popup → Background → Content Script
  → Inject overlay + cursor crosshair
  → User drag-select vùng chứa QR
  → chrome.tabs.captureVisibleTab() capture visible tab
  → Crop vùng đã chọn
  → jsQR decode ImageData
  → Parse otpauth:// URI → extract secret, issuer, name
  → Send data back to popup via background
  → Popup hiển thông tin đã parse, user confirm → save
```

**Libraries:**
- `chrome.tabs.captureVisibleTab()` — capture visible tab, không cần user permission prompt
- jsQR — decode QR từ ImageData

### 4. Auto-fill MFA Code

**Trigger:** Tab navigate/complete load

**Flow:**
```
Background (webNavigation.onCompleted)
  → Check URL với tất cả account có urlPattern
  → Nếu match:
      1. Gửi message tới content script: { action: "AUTOFILL", accounts: [...] }
      2. Content script inject floating status icon (bottom-right corner)
         - State: LOADING (spinner)
      3. Đợi page load xong + debounce 500ms
      4. Tìm MFA input field:
          - Nếu account có mfaInputSelector → dùng nó
          - Fallback heuristic: input matching autocomplete="one-time-code",
            name chứa "code"/"token"/"otp", hoặc type="tel" + maxlength 6
      5. Fill code:
         - 1 match → fill + show SUCCESS
         - Nhiều match → fill account đầu tiên + show MULTIPLE
      6. Nếu lỗi → show ERROR
```

**URL Matching:**
- Simple glob pattern: `slack.com`, `github.com/login*`
- Utility function trong `lib/url-match.ts`

**Timing:**
- Lắng nghe `chrome.webNavigation.onCompleted` (DOM loaded)
- Debounce 500ms cho SPA pages

### 5. Floating Status Icon

Vị trí: `position: fixed; bottom: 20px; right: 20px; z-index: 999999`

| State | Icon | Tooltip | Behavior |
|-------|------|---------|----------|
| LOADING | Spinner | "Đang chờ trang load..." | — |
| SUCCESS | Green checkmark | "Đã fill mã cho [account name]" | Auto-hide sau 5s (fade out) |
| ERROR | Red X | "Lỗi: [message]" | Auto-hide sau 5s |
| MULTIPLE | 3 dots (clickable) | Click → dropup menu | Stay visible |

**Icon styling:** Rounded, 40px diameter, shadow, hover effect.

### 6. Dropup Menu (MULTIPLE state)

Positioned above the icon, scrollable nếu nhiều items.

**Mỗi item layout:**

| Element | Detail |
|---------|--------|
| Left | Account icon (initial letter) + circular ring SVG countdown |
| Center | Account name (truncated nếu dài) |
| Right | Mã TOTP hiện tại (monospace, bold) |
| Far right | Countdown `8s` (text, nhỏ, muted color) |

**Countdown animation:**
- SVG circular progress ring bao quanh account icon
- Ring deplete dần trong 30s, khi còn < 5s chuyển sang đỏ
- Reset animation mỗi khi code thay đổi (synchronize với TOTP cycle)

**Behavior:**
- Tất cả items cùng đếm ngược đồng bộ (cùng TOTP cycle)
- Khi code thay đổi → ring reset + code update, không cần close menu
- Click item → fill code đó + close menu
- Auto-close khi click ra ngoài

## Message Flow

```
Popup ↔ Background ↔ Content Script

Messages:
  SCAN_QR          → Content: trigger QR capture
  QR_SCANNED       ← Content: parsed account data
  AUTOFILL         → Content: trigger auto-fill
  AUTOFILL_STATUS  ← Content: success/error/multiple
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| QR decode fail | Toast trong overlay: "Không tìm thấy QR code" |
| Invalid QR content | Toast: "QR code không hợp lệ" |
| Secret invalid | Toast khi add account: "Secret key không đúng định dạng" |
| Input field not found | Floating icon ERROR: "Không tìm thấy ô nhập mã" |
| Storage error | Toast: "Lỗi lưu trữ" |
| Permission denied | Toast: "Extension cần quyền truy cập tab" |

## TOTP Implementation

Sử dụng `otpauth` library:

```typescript
import { TOTP } from 'otpauth';

function generateCode(secret: string): { code: string; remaining: number } {
  const totp = new TOTP({ secret, digits: 6, period: 30 });
  return {
    code: totp.generate(),
    remaining: 30 - (Math.floor(Date.now() / 1000) % 30)
  };
}
```

Countdown sync: Popup và content script đều tính `remaining` từ `Date.now()` — tự đồng bộ.

## Testing Strategy

**Unit tests (Vitest):**
- `lib/totp.ts` — generate code, verify against known test vectors
- `lib/storage.ts` — CRUD operations mock chrome.storage
- `lib/url-match.ts` — pattern matching edge cases
- `lib/qr.ts` — parse otpauth:// URIs

**Manual testing:**
- Popup: add account (manual + QR), copy code, delete, reorder
- Options: same CRUD, export/import
- Auto-fill: navigate to matching URL → verify fill
- QR capture: drag-select → verify decode
- Edge cases: expired code, invalid secret, multiple matches
