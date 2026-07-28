export interface Account {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  urlPatterns?: string[];
  mfaInputSelector?: string;
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
