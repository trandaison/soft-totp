# 2FA Manager - Chrome Extension

Chrome Extension quản lý mã MFA/2FA (TOTP) với tính năng quét QR code, auto-fill, và quản lý accounts.

## Features

- Quản lý mã TOTP 2FA (6 digits, 30s period)
- Quét QR code bằng drag-select vùng màn hình
- Auto-fill mã MFA khi detect URL match
- Floating status indicator (loading/success/error/multiple)
- Dropup menu với countdown animation khi nhiều account match
- Export/Import accounts (JSON)
- HMR (Hot Module Replacement) cho development

## Tech Stack

| Component | Technology |
|-----------|------------|
| Build | Vite + CRXJS |
| Language | TypeScript |
| UI | React 18 |
| TOTP | otpauth (RFC 6238) |
| QR Decode | jsQR |
| Storage | chrome.storage.local |

## Project Structure

```
2fa-ext/
├── src/
│   ├── popup/              # React popup UI
│   ├── options/            # React options page
│   ├── background/         # Service worker (MV3)
│   ├── content/            # Content scripts
│   │   ├── qr-capture.ts   # QR scan via drag-select
│   │   ├── autofill.ts     # Auto-fill + floating status
│   │   └── overlay.ts      # Overlay UI for drag-select
│   └── lib/                # Shared logic
│       ├── totp.ts         # TOTP generation
│       ├── storage.ts      # chrome.storage wrapper
│       ├── qr.ts           # QR decode
│       ├── url-match.ts    # URL pattern matching
│       └── types.ts        # TypeScript interfaces
├── manifest.json           # Chrome Extension MV3 manifest
├── vite.config.ts          # Vite + CRXJS config
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm hoặc yarn
- Google Chrome

### Install Dependencies

```bash
npm install
```

### Development

Chạy dev server với HMR:

```bash
npm run dev
```

Sau đó load extension vào Chrome:
1. Mở Chrome → `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `dist/` (được tạo sau khi chạy `npm run dev`)

**Lưu ý:** Khi thay đổi code, extension sẽ tự động reload. Nếu không thấy thay đổi, click chuột phải vào extension icon → **Manage extension** → click icon reload.

### Build for Production

```bash
npm run build
```

Build output sẽ nằm trong thư mục `dist/`.

### Run Tests

```bash
npm run test
```

Hoặc chạy với watch mode:

```bash
npm run test:watch
```

### Type Check

```bash
npx tsc --noEmit
```

## Usage

### Thêm Account

**Cách 1: Nhập thủ công**
1. Click extension icon → popup mở
2. Click **+ Add**
3. Nhập: Account Name, Secret Key (Base32), Issuer (optional), URL Pattern (optional)
4. Click **Save**

**Cách 2: Quét QR Code**
1. Mở trang web có QR code 2FA
2. Click extension icon → click **Scan QR**
3. Drag-select vùng chứa QR code
4. Extension sẽ tự decode và hiển thị form xác nhận
5. Click **Save**

### Auto-fill MFA Code

Khi bạn truy cập trang web có URL match với account đã lưu:
- Extension tự động detect URL
- Floating icon hiển thị ở góc dưới bên phải
- Mã TOTP tự động fill vào input field
- Nếu nhiều account match → click icon 3 dots để chọn account

### Quản lý Accounts

Mở Options page:
- Click phải extension icon → **Options**
- Hoặc: `chrome://extensions/` → tìm extension → **Details** → **Extension options**

Trong Options page:
- Edit/Delete accounts
- Export accounts ra file JSON
- Import accounts từ file JSON

## Permissions

| Permission | Lý do |
|------------|-------|
| `storage` | Lưu accounts vào chrome.storage.local |
| `activeTab` | Capture screenshot để quét QR |
| `webNavigation` | Detect URL để auto-fill |
| `tabs` | Giao tiếp giữa popup và content script |

## Data Storage

- Accounts được lưu trong `chrome.storage.local` (plain text, không mã hóa)
- Export file là plain JSON

## Known Limitations

- Không mã hóa secrets (plain text trong chrome.storage)
- Không sync qua cloud
- Chỉ hỗ trợ TOTP (không hỗ trợ HOTP, Steam Guard)
- HiDPI coordinate mismatch khi quét QR trên màn hình Retina (có thể cần fix sau)

## License

MIT
