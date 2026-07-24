import { useState, type ReactNode } from 'react';
import {
  PageHeaderContext,
  type PageHeaderConfig,
} from './PageHeaderContext';
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
  const [pageHeader, setPageHeader] = useState<PageHeaderConfig>({});

  return (
    <main
      className="main-content"
      data-testid="main-content"
      data-workspace={pageHeader.workspace ? 'true' : undefined}
    >
      <PageTitleBar
        title={pageTitle}
        description={pageHeader.description}
        context={pageHeader.context}
        actions={pageHeader.actions ?? titleActions}
      />
      <PageHeaderContext.Provider value={setPageHeader}>
        <div className="main-content__scroll-region">{children}</div>
      </PageHeaderContext.Provider>
      {floatingAction && (
        <div className="main-content__floating-slot">{floatingAction}</div>
      )}
    </main>
  );
}
