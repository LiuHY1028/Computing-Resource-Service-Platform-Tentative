import { productConfig } from '../config/product';
import { runtimeConfig } from '../config/runtime';

export function EngineeringPlaceholderPage() {
  return (
    <main className="engineering-page">
      <p>前端工程初始化</p>
      <h1>{productConfig.displayName}</h1>
      <p>当前为工程占位页，工作名称并非正式产品名称。</p>
      <p>数据运行模式：{runtimeConfig.dataMode}</p>
    </main>
  );
}
