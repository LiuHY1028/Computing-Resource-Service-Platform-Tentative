import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProductConfig } from '../../config/product';
import { APP_PATHS } from '../routes';
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
    <Link
      className="app-brand"
      aria-label={product.displayName}
      data-compact={compact ? 'true' : 'false'}
      to={APP_PATHS.cloudResources}
    >
      {product.logoSrc ? (
        <img className="app-brand__logo" src={product.logoSrc} alt="" />
      ) : (
        <span className="app-brand__fallback" aria-hidden="true">
          {fallbackMark}
        </span>
      )}
      {!compact && <span className="app-brand__name">{product.displayName}</span>}
    </Link>
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
      <nav className="top-navbar__product-links" aria-label="前台产品入口">
        <Link to={APP_PATHS.marketplace}>资源商城 ↗</Link>
        <Link to={APP_PATHS.software}>软件中心 ↗</Link>
      </nav>
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
              {feedbackPanel === 'messages' ? '暂无新消息' : '当前会话'}
            </strong>
            <span>
              {feedbackPanel === 'messages'
                ? '新的平台通知将在这里显示。'
                : '当前会话未提供账号、组织或权限信息。'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
