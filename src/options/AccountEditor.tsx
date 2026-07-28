import { useState } from 'react';
import type { Account } from '../lib/types';
import { LogoPicker } from '../popup/LogoPicker';
import { InputPassword } from '../popup/InputPassword';
import { getLogoById, findLogoForAccount } from '../lib/logos';

interface Props {
  account: Account;
  onUpdate: (account: Account) => void;
  onDelete: (id: string) => void;
}

export function AccountEditor({ account, onUpdate, onDelete }: Props) {
  const [name, setName] = useState(account.name);
  const [secret, setSecret] = useState(account.secret);
  const [issuer, setIssuer] = useState(account.issuer);
  const [urlPatternsText, setUrlPatternsText] = useState(
    account.urlPatterns?.join('\n') || ''
  );
  const [mfaInputSelector, setMfaInputSelector] = useState(account.mfaInputSelector || '');
  const [logoId, setLogoId] = useState<string | undefined>(account.logoId);
  const [isEditing, setIsEditing] = useState(false);

  const parsePatterns = (text: string): string[] => {
    return text
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  };

  const handleSave = () => {
    const patterns = parsePatterns(urlPatternsText);
    onUpdate({
      ...account,
      name,
      secret: secret.replace(/\s/g, '').toUpperCase(),
      issuer,
      urlPatterns: patterns.length > 0 ? patterns : undefined,
      mfaInputSelector: mfaInputSelector || undefined,
      logoId,
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '54px', height: '54px', flexShrink: 0 }}>
            <LogoPicker
              logoId={logoId}
              issuer={issuer}
              urlPatterns={parsePatterns(urlPatternsText)}
              onSelect={setLogoId}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Secret</label>
          <InputPassword
            value={secret}
            onChange={setSecret}
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
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>URL Patterns</label>
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

  const displayPatterns = account.urlPatterns?.join(', ') || 'No URL patterns';

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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid #eee',
        }}>
          {(() => {
            const selectedLogo = account.logoId ? getLogoById(account.logoId) : undefined;
            const autoLogo = findLogoForAccount(account.issuer, account.urlPatterns);
            const displayLogo = selectedLogo || autoLogo;
            return displayLogo ? (
              <img src={displayLogo.file} alt={displayLogo.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#999' }}>{account.name.charAt(0).toUpperCase()}</span>
            );
          })()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>{account.name}</div>
          <div style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {account.issuer && `${account.issuer} • `}
            {displayPatterns}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => setIsEditing(true)} style={{ background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
        <button onClick={() => onDelete(account.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
      </div>
    </div>
  );
}
