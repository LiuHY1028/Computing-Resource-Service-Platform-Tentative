import { Link } from 'react-router-dom';
import { productConfig } from '../../config/product';
import { APP_PATHS } from '../routes';

export function ProductAreaFooter() {
  return (
    <footer className="product-area-footer">
      <div className="product-area-footer__bridge">
        <div>
          <span>统一产品入口</span>
          <strong>从资源选择到软件安装，在同一控制台持续追踪</strong>
        </div>
        <Link to={APP_PATHS.cloudResources}>进入控制台</Link>
      </div>

      <div className="product-area-footer__body">
        <div className="product-area-footer__brand">
          <strong>{productConfig.displayName}</strong>
          <p>
            面向计算资源购买、软件环境安装和资源运营管理的统一服务平台。
          </p>
        </div>

        <nav aria-label="产品与服务">
          <strong>产品与服务</strong>
          <Link to={APP_PATHS.marketplace}>资源商城</Link>
          <Link to={APP_PATHS.software}>软件中心</Link>
        </nav>

        <nav aria-label="资源管理">
          <strong>资源管理</strong>
          <Link to={APP_PATHS.cloudResources}>我的资源</Link>
          <Link to={APP_PATHS.storage}>存储管理</Link>
          <Link to={APP_PATHS.networkAccess}>网络与访问</Link>
        </nav>

        <nav aria-label="交易记录">
          <strong>交易记录</strong>
          <Link to={APP_PATHS.orders}>订单</Link>
          <Link to={APP_PATHS.bills}>账单</Link>
          <Link to={APP_PATHS.operationRecords}>操作记录</Link>
        </nav>
      </div>

      <div className="product-area-footer__bottom">
        <span>{productConfig.displayName}</span>
        <span>资源、价格和处理状态以平台当前记录为准</span>
      </div>
    </footer>
  );
}
