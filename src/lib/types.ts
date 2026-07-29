export interface Account {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  urlPatterns?: string[];
  mfaInputSelector?: string;
  logoId?: string;
  logoUrl?: string;
  createdAt: number;
  sortOrder: number;
}

export interface TOTPResult {
  code: string;
  remaining: number;
}

export interface QRScanResult {
  secret: string;
  issuer: string;
  name: string;
  logoUrl?: string;
}

export type AutofillState = 'LOADING' | 'SUCCESS' | 'ERROR' | 'MULTIPLE';

export interface AutofillStatus {
  state: AutofillState;
  message?: string;
  accounts?: Account[];
}

export interface Message {
  action: string;
  payload?: unknown;
}

export interface ScanQRMessage extends Message {
  action: 'SCAN_QR';
}

export interface QRScannedMessage extends Message {
  action: 'QR_SCANNED';
  payload: QRScanResult;
}

export interface AutofillMessage extends Message {
  action: 'AUTOFILL';
  payload: { accounts: Account[] };
}

export interface AutofillStatusMessage extends Message {
  action: 'AUTOFILL_STATUS';
  payload: AutofillStatus;
}

export interface PinConfig {
  pinHash: string;
  salt: string;
  iterations: number;
  webAuthnCredential: {
    credentialId: string;
    publicKey: string;
    transports?: string[];
  } | null;
  isSetup: boolean;
}

export interface SetupPinMessage extends Message {
  action: 'SETUP_PIN';
  payload: { pin: string; credential: { credentialId: string; publicKey: string; transports?: string[] } };
}

export interface ResetPinMessage extends Message {
  action: 'RESET_PIN';
  payload: { oldPin: string; newPin: string; assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string } };
}

export interface RemovePinMessage extends Message {
  action: 'REMOVE_PIN';
  payload: { pin: string; assertion: { credentialId: string; authenticatorData: string; clientDataJSON: string; signature: string } };
}

export interface VerifyPinMessage extends Message {
  action: 'VERIFY_PIN';
  payload: { pin: string };
}
