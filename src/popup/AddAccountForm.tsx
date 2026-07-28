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
  const [urlPattern, setUrlPattern] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !secret) return;

    const account: Account = {
      id: uuidv4(),
      name,
      issuer,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      urlPattern: urlPattern || undefined,
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
          URL Pattern (for auto-fill)
        </label>
        <input
          type="text"
          value={urlPattern}
          onChange={(e) => setUrlPattern(e.target.value)}
          placeholder="e.g., slack.com, github.com/login*"
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
