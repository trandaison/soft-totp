import { describe, it, expect } from 'vitest';
import { generateCode, parseOTPAuthURI } from '../totp';

describe('generateCode', () => {
  it('should generate 6-digit code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const result = generateCode(secret);
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.remaining).toBeLessThanOrEqual(30);
  });

  it('should generate consistent codes within same period', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const result1 = generateCode(secret);
    const result2 = generateCode(secret);
    expect(result1.code).toBe(result2.code);
  });
});

describe('parseOTPAuthURI', () => {
  it('should parse otpauth:// URI with all fields', () => {
    const uri = 'otpauth://totp/Slack:john@slack.com?secret=JBSWY3DPEHPK3PXP&issuer=Slack';
    const result = parseOTPAuthURI(uri);
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.issuer).toBe('Slack');
    expect(result.name).toBe('john@slack.com');
  });

  it('should parse otpauth:// URI without issuer', () => {
    const uri = 'otpauth://totp/john@slack.com?secret=JBSWY3DPEHPK3PXP';
    const result = parseOTPAuthURI(uri);
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.issuer).toBe('');
    expect(result.name).toBe('john@slack.com');
  });

  it('should throw on invalid URI', () => {
    expect(() => parseOTPAuthURI('invalid')).toThrow();
  });
});
