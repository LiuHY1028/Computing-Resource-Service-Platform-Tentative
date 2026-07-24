import { Link } from 'react-router-dom';
import { APP_PATHS } from '../app/routes';

type NotFoundPageProps = {
  homePath: string;
};

export function NotFoundPage({ homePath }: NotFoundPageProps) {
  return (
    <main className="engineering-page">
      <h1>404</h1>
      <p>未找到请求的页面。</p>
      <div className="management-row-actions">
        <Link to={homePath}>返回资源商城</Link>
        <Link to={APP_PATHS.cloudResources}>进入控制台</Link>
      </div>
    </main>
  );
}
