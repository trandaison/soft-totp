import { useState, useEffect } from 'react';
import type { Account } from '../lib/types';
import { generateCode } from '../lib/totp';

interface Props {
  account: Account;
  onDelete: (id: string) => void;
}

export function AccountCard({ account, onDelete }: Props) {
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    const update = () => {
      const result = generateCode(account.secret);
      setCode(result.code);
      setRemaining(result.remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [account.secret]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
  };

  const circumference = 2 * Math.PI * 14;
  const dashoffset = circumference * (remaining / 30);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      background: '#fff',
      borderRadius: '8px',
      marginBottom: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <div style={{ position: 'relative', marginRight: '12px' }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#eee" strokeWidth="2" />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke={remaining < 5 ? '#e74c3c' : '#2ecc71'}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 16 16)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          fontWeight: 'bold',
        }}>
          {account.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>{account.name}</div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '20px',
          fontWeight: 'bold',
          letterSpacing: '2px',
          color: '#333',
        }}>
          {code}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={copyCode} style={{
          background: '#3498db',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          Copy
        </button>
        <button onClick={() => onDelete(account.id)} style={{
          background: '#e74c3c',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: '12px',
        }}>
          Delete
        </button>
      </div>
    </div>
  );
}
