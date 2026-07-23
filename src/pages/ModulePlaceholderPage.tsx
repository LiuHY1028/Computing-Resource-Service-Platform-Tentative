import { Link } from 'react-router-dom';
import {
  getAppPageRoute,
  type AppPageRoute,
} from '../app/routes';
import './ModulePlaceholderPage.css';

type ModulePlaceholderPageProps = Readonly<{
  route: AppPageRoute;
}>;

export function ModulePlaceholderPage({ route }: ModulePlaceholderPageProps) {
  const relatedRoutes = route.relatedPageIds
    .map(getAppPageRoute)
    .filter((relatedRoute) => !relatedRoute.path.includes(':'));

  return (
    <section
      className="module-placeholder-page"
      aria-labelledby={`service-${route.pageId}`}
    >
      <div className="module-placeholder-page__content">
        <p className="module-placeholder-page__eyebrow">服务状态</p>
        <h2 id={`service-${route.pageId}`}>{route.pageTitle}</h2>
        <dl className="module-placeholder-page__metadata">
          <div>
            <dt>所属模块</dt>
            <dd>{route.moduleLabel}</dd>
          </div>
        </dl>
        <p>{route.purpose}</p>
        <p className="module-placeholder-page__notice">
          该服务当前暂未开放，请通过相关入口继续使用已开放功能。
        </p>
        {relatedRoutes.length > 0 && (
          <nav className="module-placeholder-page__related" aria-label="相关模块导航">
            <span>相关入口</span>
            {relatedRoutes.map((relatedRoute) => (
              <Link to={relatedRoute.path} key={relatedRoute.pageId}>
                {relatedRoute.pageTitle}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
