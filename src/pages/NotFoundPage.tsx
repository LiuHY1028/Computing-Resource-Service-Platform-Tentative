import { Link } from 'react-router-dom';

type NotFoundPageProps = {
  homePath: string;
};

export function NotFoundPage({ homePath }: NotFoundPageProps) {
  return (
    <main className="engineering-page">
      <h1>404</h1>
      <p>未找到请求的页面。</p>
      <Link to={homePath}>返回工程首页</Link>
    </main>
  );
}
