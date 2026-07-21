import { useEffect, useState } from 'react';
import type { ProductConfig } from '../../config/product';
import { MessageIcon, UserIcon } from './icons/AppShellIcons';

type TopNavbarProps = Readonly<{
  product: ProductConfig;
  collapsed: boolean;
}>;

type FeedbackPanel = 'messages' | 'user' | null;

function BrandIdentity({
  product,
  compact,
}: Readonly<{ product: ProductConfig; compact: boolean }>) {
  const fallbackMark = product.displayName.trim().slice(0, 1) || '算';

  return (
    <div
      className="app-brand"
      aria-label={product.displayName}
      data-compact={compact ? 'true' : 'false'}
    >
      {product.logoSrc ? (
        <img className="app-brand__logo" src={product.logoSrc} alt="" />
      ) : (
        <span className="app-brand__fallback" aria-hidden="true">
          {fallbackMark}
        </span>
      )}
      {!compact && <span className="app-brand__name">{product.displayName}</span>}
    </div>
  );
}

export function TopNavbar({ product, collapsed }: TopNavbarProps) {
  const [feedbackPanel, setFeedbackPanel] = useState<FeedbackPanel>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setFeedbackPanel(null);
      }
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  function toggleFeedback(panel: Exclude<FeedbackPanel, null>) {
    setFeedbackPanel((current) => (current === panel ? null : panel));
  }

  return (
    <header className="top-navbar" data-testid="top-navbar">
      <div className="top-navbar__brand-region">
        <BrandIdentity product={product} compact={collapsed} />
      </div>
      <div className="top-navbar__adaptive-region" aria-hidden="true" />
      <div className="top-navbar__actions">
        <button
          type="button"
          className="top-navbar__action-button"
          aria-label="消息入口"
          aria-expanded={feedbackPanel === 'messages'}
          aria-controls="navbar-feedback-panel"
          onClick={() => toggleFeedback('messages')}
        >
          <MessageIcon />
        </button>
        <button
          type="button"
          className="top-navbar__action-button top-navbar__action-button--user"
          aria-label="当前用户入口"
          aria-expanded={feedbackPanel === 'user'}
          aria-controls="navbar-feedback-panel"
          onClick={() => toggleFeedback('user')}
        >
          <span className="top-navbar__avatar" aria-hidden="true">
            <UserIcon />
          </span>
        </button>
        {feedbackPanel && (
          <div
            id="navbar-feedback-panel"
            className="top-navbar__feedback"
            role="status"
          >
            <strong>
              {feedbackPanel === 'messages' ? '消息功能待接入' : '用户功能待接入'}
            </strong>
            <span>
              {feedbackPanel === 'messages'
                ? '当前阶段仅保留应用级消息入口。'
                : '当前阶段不创建真实账号、组织或权限信息。'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
