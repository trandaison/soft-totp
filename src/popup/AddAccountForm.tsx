import { useState } from 'react';
import type { Account } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onAdd: (account: Account) => void;
  onCancel: () => void;
  initialData?: { secret: string; issuer: string; name: string };
}

export function AddAccountForm({ onAdd, onCancel, initialData }: Props) {
  const [name, setName] = useState(initialData?.name || '');
  const [secret, setSecret] = useState(initialData?.secret || '');
  const [issuer, setIssuer] = useState(initialData?.issuer || '');
  const [urlPatternsText, setUrlPatternsText] = useState('');

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
    const account: Account = {
      id: uuidv4(),
      name,
      issuer,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      urlPatterns: patterns.length > 0 ? patterns : undefined,
      createdAt: Date.now(),
      sortOrder: 0,
    };
    onAdd(account);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px' }}>Add Account</h3>
      <div style={{ marginBottom: '12px' }}>
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
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Secret Key *
        </label>
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Base32 secret key"
          required
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
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
      <div style={{ marginBottom: '16px' }}>
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
