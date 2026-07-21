import type { ReactNode } from 'react';
import { PageTitleBar } from './PageTitleBar';

type MainContentProps = Readonly<{
  pageTitle: string;
  children: ReactNode;
  titleActions?: ReactNode;
  floatingAction?: ReactNode;
}>;

export function MainContent({
  pageTitle,
  children,
  titleActions,
  floatingAction,
}: MainContentProps) {
  return (
    <main className="main-content" data-testid="main-content">
      <PageTitleBar title={pageTitle} actions={titleActions} />
      <div className="main-content__scroll-region">{children}</div>
      {floatingAction && (
        <div className="main-content__floating-slot">{floatingAction}</div>
      )}
    </main>
  );
}
