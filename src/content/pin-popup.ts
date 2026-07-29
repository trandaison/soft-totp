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
