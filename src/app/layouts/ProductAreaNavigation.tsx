import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { productConfig } from '../../config/product';
import { APP_PATHS } from '../routes';

type ProductAreaNavigationProps = Readonly<{
  variant: 'marketplace' | 'software';
}>;

function ProductBrand() {
  const fallbackMark = productConfig.displayName.trim().slice(0, 1) || '算';

  return (
    <Link
      className="product-area-brand"
      to={APP_PATHS.marketplace}
      aria-label={`${productConfig.displayName}首页`}
    >
      {productConfig.logoSrc ? (
        <img className="product-area-brand__logo" src={productConfig.logoSrc} alt="" />
      ) : (
        <span className="product-area-brand__mark" aria-hidden="true">
          {fallbackMark}
        </span>
      )}
      <span className="product-area-brand__name">{productConfig.displayName}</span>
    </Link>
  );
}

export function ProductAreaNavigation({
  variant,
}: ProductAreaNavigationProps) {
  const location = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <header
      className="product-area-navigation"
      data-variant={variant}
      data-testid={`${variant}-navigation`}
    >
      <ProductBrand />
      <nav className="product-area-navigation__links" aria-label="产品区域">
        <NavLink
          to={APP_PATHS.marketplace}
          className={location.pathname.startsWith(APP_PATHS.marketplace) ? 'is-active' : ''}
        >
          资源商城
        </NavLink>
        <NavLink
          to={APP_PATHS.software}
          className={location.pathname.startsWith(APP_PATHS.software) ? 'is-active' : ''}
        >
          软件中心
        </NavLink>
      </nav>
      <div className="product-area-navigation__actions">
        <button
          type="button"
          className="product-area-navigation__message"
          aria-label="消息入口"
          aria-expanded={feedbackOpen}
          onClick={() => setFeedbackOpen((current) => !current)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0v4.1l1.6 2.7a1 1 0 0 1-.86 1.5H5.26a1 1 0 0 1-.86-1.5L6 12.1V8Zm4 10.3h4a2 2 0 0 1-4 0Z" />
          </svg>
        </button>
        <Link className="product-area-navigation__console" to={APP_PATHS.cloudResources}>
          进入控制台
          <span aria-hidden="true">↗</span>
        </Link>
        <span className="product-area-navigation__avatar" aria-label="当前用户">
          用
        </span>
        {feedbackOpen && (
          <div className="product-area-navigation__feedback" role="status">
            <strong>暂无新消息</strong>
            <span>新的平台通知将在这里显示。</span>
          </div>
        )}
      </div>
    </header>
  );
}
