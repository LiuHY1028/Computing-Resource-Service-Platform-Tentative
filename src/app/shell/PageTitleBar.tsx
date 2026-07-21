import type { ReactNode } from 'react';

type PageTitleBarProps = Readonly<{
  title: string;
  actions?: ReactNode;
}>;

export function PageTitleBar({ title, actions }: PageTitleBarProps) {
  return (
    <header className="page-title-bar">
      <h1>{title}</h1>
      {actions && <div className="page-title-bar__actions">{actions}</div>}
    </header>
  );
}
