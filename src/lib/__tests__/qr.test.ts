// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { decodeQR } from '../qr';

describe('decodeQR', () => {
  it('should return null for empty image data', () => {
    const imageData = new ImageData(100, 100);
    const result = decodeQR(imageData);
    expect(result).toBeNull();
  });
});
