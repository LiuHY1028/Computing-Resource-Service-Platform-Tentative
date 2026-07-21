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
      aria-labelledby={`placeholder-${route.pageId}`}
    >
      <div className="module-placeholder-page__content">
        <p className="module-placeholder-page__eyebrow">模块占位页面</p>
        <h2 id={`placeholder-${route.pageId}`}>{route.pageTitle}</h2>
        <dl className="module-placeholder-page__metadata">
          <div>
            <dt>所属模块</dt>
            <dd>{route.moduleLabel}</dd>
          </div>
          <div>
            <dt>页面 ID</dt>
            <dd>{route.pageId}</dd>
          </div>
        </dl>
        <p>{route.purpose}</p>
        <p className="module-placeholder-page__notice">
          正式业务内容将在后续任务实现。本阶段只验证应用框架、导航与路由关系。
        </p>
        <p className="module-placeholder-page__phase">后续阶段：{route.implementationPhase}</p>
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
