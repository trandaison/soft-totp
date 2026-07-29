export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function derivePinHash(
  pin: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray));
}

export async function verifyPin(
  pin: string,
  storedHash: string,
  salt: Uint8Array,
  iterations: number
): Promise<boolean> {
  const derivedHash = await derivePinHash(pin, salt, iterations);
  return derivedHash === storedHash;
}
