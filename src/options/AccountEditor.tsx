import { useState } from 'react';
import type { Account } from '../lib/types';

interface Props {
  account: Account;
  onUpdate: (account: Account) => void;
  onDelete: (id: string) => void;
}

export function AccountEditor({ account, onUpdate, onDelete }: Props) {
  const [name, setName] = useState(account.name);
  const [secret, setSecret] = useState(account.secret);
  const [issuer, setIssuer] = useState(account.issuer);
  const [urlPattern, setUrlPattern] = useState(account.urlPattern || '');
  const [mfaInputSelector, setMfaInputSelector] = useState(account.mfaInputSelector || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate({
      ...account,
      name,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      issuer,
      urlPattern: urlPattern || undefined,
      mfaInputSelector: mfaInputSelector || undefined,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Secret</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Issuer</label>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>URL Pattern</label>
          <input
            type="text"
            value={urlPattern}
            onChange={(e) => setUrlPattern(e.target.value)}
            placeholder="e.g., slack.com"
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>MFA Input Selector</label>
          <input
            type="text"
            value={mfaInputSelector}
            onChange={(e) => setMfaInputSelector(e.target.value)}
            placeholder="CSS selector for MFA input"
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSave} style={{ background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', flex: 1 }}>Save</button>
          <button onClick={() => setIsEditing(false)} style={{ background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', flex: 1 }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 500 }}>{account.name}</div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          {account.issuer && `${account.issuer} • `}
          {account.urlPattern || 'No URL pattern'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setIsEditing(true)} style={{ background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
        <button onClick={() => onDelete(account.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
      </div>
    </div>
  );
}
