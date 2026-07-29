import { colors } from '../lib/colors';

export type Subpage = 'rules' | 'security' | 'import-export';

interface Props {
  active: Subpage;
  onChange: (page: Subpage) => void;
}

const items: { key: Subpage; label: string; icon: string }[] = [
  { key: 'rules', label: 'Autofill Rules', icon: '⚙️' },
  { key: 'security', label: 'Security', icon: '🔒' },
  { key: 'import-export', label: 'Import & Export', icon: '📦' },
];

export function Sidebar({ active, onChange }: Props) {
  return (
    <nav style={{
      width: 200,
      flexShrink: 0,
      background: colors.bgCard,
      borderRight: `1px solid ${colors.borderLight}`,
      padding: '16px 0',
      minHeight: '100vh',
    }}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 20px',
            border: 'none',
            background: active === item.key ? `${colors.primary}10` : 'transparent',
            color: active === item.key ? colors.primary : colors.textPrimary,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: active === item.key ? 600 : 400,
            textAlign: 'left',
            borderLeft: active === item.key ? `3px solid ${colors.primary}` : '3px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
