import { describe, it, expect } from 'vitest';
import { matchURL } from '../url-match';

describe('matchURL', () => {
  it('should match exact domain', () => {
    expect(matchURL('slack.com', 'https://slack.com/signin')).toBe(true);
  });

  it('should match domain with wildcard path', () => {
    expect(matchURL('github.com/login*', 'https://github.com/login')).toBe(true);
    expect(matchURL('github.com/login*', 'https://github.com/login/2fa')).toBe(true);
  });

  it('should not match different domain', () => {
    expect(matchURL('slack.com', 'https://github.com')).toBe(false);
  });

  it('should match subdomain', () => {
    expect(matchURL('*.slack.com', 'https://app.slack.com')).toBe(true);
  });

  it('should handle pattern without protocol', () => {
    expect(matchURL('slack.com', 'http://slack.com')).toBe(true);
    expect(matchURL('slack.com', 'https://app.slack.com')).toBe(true);
  });

  it('should handle empty pattern', () => {
    expect(matchURL('', 'https://slack.com')).toBe(false);
  });
});
