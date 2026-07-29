import { describe, it, expect } from 'vitest';
import { derivePinHash, verifyPin, generateSalt } from '../pin';

describe('pin.ts', () => {
  describe('generateSalt', () => {
    it('should return a Uint8Array of 16 bytes', () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate different salts on each call', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect([...salt1]).not.toEqual([...salt2]);
    });
  });

  describe('derivePinHash', () => {
    it('should return a base64 string', async () => {
      const salt = generateSalt();
      const hash = await derivePinHash('123456', salt, 100000);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(() => atob(hash)).not.toThrow();
    });

    it('should produce same hash for same inputs', async () => {
      const salt = generateSalt();
      const hash1 = await derivePinHash('123456', salt, 100000);
      const hash2 = await derivePinHash('123456', salt, 100000);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different PINs', async () => {
      const salt = generateSalt();
      const hash1 = await derivePinHash('123456', salt, 100000);
      const hash2 = await derivePinHash('654321', salt, 100000);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash for different salts', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = await derivePinHash('123456', salt1, 100000);
      const hash2 = await derivePinHash('123456', salt2, 100000);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPin', () => {
    it('should return true for correct PIN', async () => {
      const salt = generateSalt();
      const hash = await derivePinHash('123456', salt, 100000);
      const result = await verifyPin('123456', hash, salt, 100000);
      expect(result).toBe(true);
    });

    it('should return false for incorrect PIN', async () => {
      const salt = generateSalt();
      const hash = await derivePinHash('123456', salt, 100000);
      const result = await verifyPin('654321', hash, salt, 100000);
      expect(result).toBe(false);
    });
  });
});
