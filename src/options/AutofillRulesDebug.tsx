import { useState, useEffect } from 'react';
import { colors } from '../lib/colors';

interface AutofillRule {
  mfaInputSelector: string;
}

export function AutofillRulesDebug() {
  const [rules, setRules] = useState<Record<string, AutofillRule> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRules = () => {
    chrome.runtime.sendMessage({ action: 'GET_AUTOFILL_RULES' }, (res) => {
      setRules(res?.rules ?? null);
    });
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: 'REFRESH_AUTOFILL_RULES' }, (res) => {
      setRules(res?.rules ?? null);
      setLoading(false);
    });
  };

  const ruleCount = rules ? Object.keys(rules).length : 0;

  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '20px',
      border: `1px solid ${colors.borderLight}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: rules ? '12px' : '0',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: colors.textPrimary }}>
            Autofill Rules
          </div>
          <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
            {rules === null
              ? 'Not loaded'
              : `${ruleCount} rule${ruleCount !== 1 ? 's' : ''} cached`}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            background: loading ? colors.textSecondary : colors.primaryLight,
            color: colors.textLight,
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: loading ? 'default' : 'pointer',
            fontWeight: 500,
            fontSize: '13px',
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {rules && ruleCount > 0 && (
        <pre style={{
          background: colors.bg,
          borderRadius: '8px',
          padding: '12px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '12px',
          lineHeight: '1.5',
          fontFamily: 'monospace',
        }}>
          {JSON.stringify(rules, null, 2)}
        </pre>
      )}

      {rules && ruleCount === 0 && (
        <div style={{
          background: colors.bg,
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          color: colors.textSecondary,
          textAlign: 'center',
        }}>
          No rules loaded
        </div>
      )}
    </div>
  );
}
