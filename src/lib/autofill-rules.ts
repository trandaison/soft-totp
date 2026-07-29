import { matchURL } from './url-match';

const FETCH_URL = 'https://raw.githubusercontent.com/trandaison/soft-totp/refs/heads/main/autofill-rules.json';

let cachedRules: Record<string, { mfaInputSelector: string }> | null = null;

export async function fetchAutofillRules(): Promise<void> {
  try {
    const response = await fetch(FETCH_URL);
    if (!response.ok) return;
    const data = await response.json();
    if (data && typeof data.autofillRules === 'object') {
      cachedRules = data.autofillRules;
    }
  } catch {
    // Silent failure — cachedRules stays null
  }
}

export function getMfaSelector(url: string): string | null {
  if (!cachedRules) return null;
  for (const [pattern, config] of Object.entries(cachedRules)) {
    if (matchURL(pattern, url)) {
      return config.mfaInputSelector;
    }
  }
  return null;
}
