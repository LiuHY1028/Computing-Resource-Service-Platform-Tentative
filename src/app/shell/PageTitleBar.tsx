import type { ReactNode } from 'react';

type PageTitleBarProps = Readonly<{
  title: string;
  description?: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
}>;

export function PageTitleBar({
  title,
  description,
  context,
  actions,
}: PageTitleBarProps) {
  return (
    <header className="page-title-bar">
      <div className="page-title-bar__identity">
        <div className="page-title-bar__title-line">
          <h1>{title}</h1>
          {context && <div className="page-title-bar__context">{context}</div>}
        </div>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-title-bar__actions">{actions}</div>}
    </header>
  );
}
