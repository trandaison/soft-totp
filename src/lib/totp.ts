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
  const pathParts = url.pathname.replace(/^\//, '').split(':');
  const name = pathParts.length > 1 ? pathParts[1] : pathParts[0];

  return { secret, issuer, name: decodeURIComponent(name) };
}
