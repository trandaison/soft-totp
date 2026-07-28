import { useState } from 'react';
import type { Account } from '../lib/types';
import { LogoPicker } from '../popup/LogoPicker';
import { InputPassword } from '../popup/InputPassword';
import { getLogoById, findLogoForAccount } from '../lib/logos';
import { colors } from '../lib/colors';

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
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${colors.borderLight}`,
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
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: colors.textPrimary, fontWeight: 500 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                boxSizing: 'border-box',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: colors.textPrimary, fontWeight: 500 }}>Secret</label>
          <InputPassword
            value={secret}
            onChange={setSecret}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: colors.textPrimary, fontWeight: 500 }}>Issuer</label>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxSizing: 'border-box',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: colors.textPrimary, fontWeight: 500 }}>URL Patterns</label>
          <textarea
            value={urlPatternsText}
            onChange={(e) => setUrlPatternsText(e.target.value)}
            placeholder={"One pattern per line or comma-separated:\nslack.com\nslack.com/z-app-*"}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxSizing: 'border-box',
              resize: 'vertical',
              fontSize: '13px',
            }}
          />
          <div style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '4px' }}>
            Matches if URL matches ANY of these patterns
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: colors.textPrimary, fontWeight: 500 }}>MFA Input Selector</label>
          <input
            type="text"
            value={mfaInputSelector}
            onChange={(e) => setMfaInputSelector(e.target.value)}
            placeholder="CSS selector for MFA input"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxSizing: 'border-box',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSave}
            style={{
              background: colors.success,
              color: colors.textLight,
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              flex: 1,
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            style={{
              background: colors.textSecondary,
              color: colors.textLight,
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              flex: 1,
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const displayPatterns = account.urlPatterns?.join(', ') || 'No URL patterns';

  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: `1px solid ${colors.borderLight}`,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${colors.borderLight}`,
        }}>
          {(() => {
            const selectedLogo = account.logoId ? getLogoById(account.logoId) : undefined;
            const autoLogo = findLogoForAccount(account.issuer, account.urlPatterns);
            const displayLogo = selectedLogo || autoLogo;
            return displayLogo ? (
              <img src={displayLogo.file} alt={displayLogo.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: colors.primary }}>{account.name.charAt(0).toUpperCase()}</span>
            );
          })()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: colors.textPrimary }}>{account.name}</div>
          <div style={{ fontSize: '12px', color: colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
            {account.issuer && `${account.issuer} • `}
            {displayPatterns}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            background: colors.primaryLight,
            color: colors.textLight,
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(account.id)}
          style={{
            background: colors.error,
            color: colors.textLight,
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
