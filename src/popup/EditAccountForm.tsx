import { useState } from 'react';
import type { Account } from '../lib/types';
import { LogoPicker } from './LogoPicker';
import { InputPassword } from './InputPassword';

interface Props {
  account: Account;
  onSave: (account: Account) => void;
  onCancel: () => void;
}

export function EditAccountForm({ account, onSave, onCancel }: Props) {
  const [name, setName] = useState(account.name);
  const [secret, setSecret] = useState(account.secret);
  const [issuer, setIssuer] = useState(account.issuer);
  const [urlPatternsText, setUrlPatternsText] = useState(
    account.urlPatterns?.join('\n') || ''
  );
  const [mfaInputSelector, setMfaInputSelector] = useState(account.mfaInputSelector || '');
  const [logoId, setLogoId] = useState<string | undefined>(account.logoId);

  const parsePatterns = (text: string): string[] => {
    return text
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !secret) return;

    const patterns = parsePatterns(urlPatternsText);
    onSave({
      ...account,
      name,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      issuer,
      urlPatterns: patterns.length > 0 ? patterns : undefined,
      mfaInputSelector: mfaInputSelector || undefined,
      logoId,
      logoUrl: account.logoUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ margin: '0 0 16px' }}>Edit Account</h3>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <LogoPicker
          logoId={logoId}
          issuer={issuer}
          urlPatterns={parsePatterns(urlPatternsText)}
          onSelect={setLogoId}
          size={54}
        />
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Account Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Slack, GitHub"
            required
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Secret Key *
        </label>
        <InputPassword
          value={secret}
          onChange={setSecret}
          placeholder="Base32 secret key"
          required
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Issuer
        </label>
        <input
          type="text"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder="e.g., Slack, GitHub"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          URL Patterns (for auto-fill)
        </label>
        <textarea
          value={urlPatternsText}
          onChange={(e) => setUrlPatternsText(e.target.value)}
          placeholder={"One pattern per line or comma-separated:\nslack.com\nslack.com/z-app-*"}
          rows={3}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontSize: '13px',
          }}
        />
        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
          Matches if URL matches ANY of these patterns
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          MFA Input Selector
        </label>
        <input
          type="text"
          value={mfaInputSelector}
          onChange={(e) => setMfaInputSelector(e.target.value)}
          placeholder="CSS selector for MFA input"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" style={{
          background: '#2ecc71',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
          cursor: 'pointer',
          flex: 1,
        }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{
          background: '#95a5a6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 20px',
          cursor: 'pointer',
          flex: 1,
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
