export interface WebAuthnCredential {
  credentialId: string;
  publicKey: string;
  transports?: string[];
}

export interface WebAuthnAssertion {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}

export async function registerCredential(): Promise<WebAuthnCredential> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Soft TOTP', id: chrome.runtime.id },
      user: {
        id: userId,
        name: 'softtotp-user',
        displayName: 'Soft TOTP User',
      },
      challenge,
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('WebAuthn registration failed');
  }

  const pubKeyCredential = credential as PublicKeyCredential;
  const response = pubKeyCredential.response as AuthenticatorAttestationResponse;

  return {
    credentialId: btoa(
      String.fromCharCode(...new Uint8Array(pubKeyCredential.rawId))
    ),
    publicKey: btoa(
      String.fromCharCode(...new Uint8Array(response.getPublicKey()!))
    ),
    transports: (response as any).getTransports?.() || [],
  };
}

export async function verifyAssertion(
  assertion: WebAuthnAssertion,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const authenticatorData = Uint8Array.from(atob(assertion.authenticatorData), (c) => c.charCodeAt(0));
    const clientDataJSON = Uint8Array.from(atob(assertion.clientDataJSON), (c) => c.charCodeAt(0));
    const signature = Uint8Array.from(atob(assertion.signature), (c) => c.charCodeAt(0));

    const signedData = new Uint8Array(authenticatorData.length + clientDataJSON.length);
    signedData.set(authenticatorData);
    signedData.set(clientDataJSON, authenticatorData.length);

    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      signedData
    );
  } catch {
    return false;
  }
}

export async function authenticateCredential(
  credentialId: string
): Promise<WebAuthnAssertion> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('WebAuthn authentication failed');
  }

  const pubKeyCredential = credential as PublicKeyCredential;
  const response = pubKeyCredential.response as AuthenticatorAssertionResponse;

  return {
    credentialId: btoa(
      String.fromCharCode(...new Uint8Array(pubKeyCredential.rawId))
    ),
    authenticatorData: btoa(
      String.fromCharCode(...new Uint8Array(response.authenticatorData))
    ),
    clientDataJSON: btoa(
      String.fromCharCode(...new Uint8Array(response.clientDataJSON))
    ),
    signature: btoa(
      String.fromCharCode(...new Uint8Array(response.signature))
    ),
  };
}
