import { Button, Container, TextButton } from '../../../components/ui';
import type { PurchaseSubmissionResult } from '../types';
import { PricingSummary } from '../../pricing';

type PurchaseSuccessStateProps = Readonly<{
  result: PurchaseSubmissionResult;
  onReturn: () => void;
  onViewOrder: (orderId: string) => void;
}>;

export function PurchaseSuccessState({ result, onReturn, onViewOrder }: PurchaseSuccessStateProps) {
  return (
    <section className="purchase-page purchase-success-page" data-resource-type={result.resourceType} aria-label="配置提交成功">
      <Container as="section" className="purchase-success" variant="success" aria-labelledby="purchase-success-title">
        <div className="purchase-success__icon" aria-hidden="true">✓</div>
        <span className="purchase-success__eyebrow">配置提交成功</span>
        <h2 id="purchase-success-title">配置已提交</h2>
        <p>申请编号 <strong>{result.applicationId}</strong></p>
        <div className="purchase-success__identity">
          <span>{result.resourceType === 'cloud-server' ? '云服务器' : '物理机'}</span>
          <strong>{result.productName}</strong>
        </div>
        <details className="purchase-success__details">
          <summary>查看配置摘要</summary>
          <dl>
            {result.summary.map((item) => (
              <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        </details>
        <PricingSummary value={result.priceSnapshot} title="提交时费用快照" />
        {result.resourceType === 'physical-machine' && (
          <section className="purchase-success__delivery" aria-labelledby="purchase-success-delivery-title">
            <h3 id="purchase-success-delivery-title">交付流程</h3>
            <ol>
              <li><strong>申请受理后进入资源准备</strong><span>平台协调物理机部署和基础初始化。</span></li>
              <li><strong>等待资源可用</strong><span>实际时间以资源和网络准备情况为准。</span></li>
              <li><strong>查看连接信息</strong><span>部署完成后将在“我的资源”中提供连接信息。</span></li>
            </ol>
            <dl>
              <div><dt>处理进度</dt><dd>等待资源交付</dd></div>
              <div><dt>内网 IP</dt><dd>资源就绪后生成</dd></div>
              <div><dt>公网 IP</dt><dd>按网络策略分配</dd></div>
              <div><dt>SSH 命令</dt><dd>资源就绪后生成</dd></div>
            </dl>
          </section>
        )}
        <div className="purchase-processing-status" role="status">
          <span>处理进度</span>
          <strong>{result.resourceType === 'physical-machine' ? '等待资源交付' : '等待资源准备'}</strong>
          <p>连接信息将在资源就绪后生成。</p>
        </div>
        <div className="purchase-success__actions">
          <Button variant="primary" onClick={() => onViewOrder(result.orderId)}>查看申请详情</Button>
          <Button variant="secondary" onClick={onReturn}>返回资源商城</Button>
          <TextButton onClick={() => document.querySelector<HTMLDetailsElement>('.purchase-success__details')?.setAttribute('open', '')}>
            查看配置摘要
          </TextButton>
        </div>
      </Container>
    </section>
  );
}
