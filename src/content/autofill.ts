import { generateCode } from '../lib/totp';
import type { Account, AutofillState } from '../lib/types';

let floatingIcon: HTMLDivElement | null = null;
let dropupMenu: HTMLDivElement | null = null;
let floatingIconClickHandler: (() => void) | null = null;
let documentClickHandler: ((e: MouseEvent) => void) | null = null;

function fadeOutAndRemove(): void {
  if (!floatingIcon) return;
  floatingIcon.style.opacity = '0';
  setTimeout(() => {
    if (floatingIcon && floatingIcon.parentNode) {
      floatingIcon.parentNode.removeChild(floatingIcon);
      floatingIcon = null;
    }
  }, 300);
}

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
      setTimeout(fadeOutAndRemove, 5000);
      break;
    case 'ERROR':
      floatingIcon.innerHTML = '✕';
      floatingIcon.title = message || 'Error occurred';
      floatingIcon.style.background = '#e74c3c';
      setTimeout(fadeOutAndRemove, 5000);
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

  if (!document.getElementById('twofa-spin-style')) {
    const style = document.createElement('style');
    style.id = 'twofa-spin-style';
    style.textContent = `
      @keyframes twofa-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
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

    if (floatingIconClickHandler) {
      floatingIcon?.removeEventListener('click', floatingIconClickHandler);
    }
    if (documentClickHandler) {
      document.removeEventListener('click', documentClickHandler);
    }

    floatingIconClickHandler = () => {
      if (dropupMenu) {
        closeDropupMenu();
      } else {
        createDropupMenu(accounts);
      }
    };

    documentClickHandler = (e: MouseEvent) => {
      if (
        dropupMenu &&
        !dropupMenu.contains(e.target as Node) &&
        e.target !== floatingIcon
      ) {
        closeDropupMenu();
      }
    };

    floatingIcon?.addEventListener('click', floatingIconClickHandler);
    document.addEventListener('click', documentClickHandler);
  }
}
