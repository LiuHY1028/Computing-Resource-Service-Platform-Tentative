import type { ReactNode } from 'react';

type FloatingActionProps = Readonly<{
  label: string;
  icon: ReactNode;
  onClick: () => void;
}>;

// AppShell-private capability from PDF p.7. Formal pages do not render it by default.
export function FloatingAction({ label, icon, onClick }: FloatingActionProps) {
  return (
    <button
      type="button"
      className="app-shell-floating-action"
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
