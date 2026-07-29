import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAutofillRules, getMfaSelector, resetForTesting } from '../autofill-rules';

describe('autofill-rules', () => {
  beforeEach(() => {
    resetForTesting();
    vi.restoreAllMocks();
  });

  describe('getMfaSelector', () => {
    it('returns null when no rules loaded', () => {
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });

    it('returns null when URL does not match any rule', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          autofillRules: {
            'github.com/sessions/two-factor': { mfaInputSelector: "input[name='otp']" }
          }
        })
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://example.com')).toBeNull();
    });

    it('returns mfaInputSelector when URL matches', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          autofillRules: {
            'github.com/sessions/two-factor': { mfaInputSelector: "input[name='otp']" }
          }
        })
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBe("input[name='otp']");
    });

    it('matches wildcard patterns', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          autofillRules: {
            'accounts.google.com/signin/challenge/*': { mfaInputSelector: "input[id='totpPin']" }
          }
        })
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://accounts.google.com/signin/challenge/12345')).toBe("input[id='totpPin']");
    });
  });

  describe('fetchAutofillRules', () => {
    it('handles fetch failure silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });

    it('handles invalid JSON silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });

    it('handles non-ok response silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      }));
      await fetchAutofillRules();
      expect(getMfaSelector('https://github.com/sessions/two-factor')).toBeNull();
    });
  });
});
