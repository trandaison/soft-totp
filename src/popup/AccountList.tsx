import type { Account } from '../lib/types';
import { AccountCard } from './AccountCard';

interface Props {
  accounts: Account[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function AccountList({ accounts, onDelete, onEdit }: Props) {
  if (accounts.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#999',
      }}>
        No accounts yet. Click &quot;Add Account&quot; to get started.
      </div>
    );
  }

  return (
    <div>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
