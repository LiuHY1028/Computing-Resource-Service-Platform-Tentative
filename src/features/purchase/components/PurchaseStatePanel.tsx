import { Button, Container } from '../../../components/ui';

type PurchaseStatePanelProps = Readonly<{
  tone?: 'loading' | 'error' | 'missing' | 'mismatch' | 'unavailable';
  title: string;
  description: string;
  onRetry?: () => void;
  onReturn: () => void;
}>;

export function PurchaseStatePanel({ tone = 'missing', title, description, onRetry, onReturn }: PurchaseStatePanelProps) {
  return (
    <section className="purchase-page purchase-state-page" aria-label="购买配置页面状态">
      <Container as="section" className="purchase-state" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
        <span className="purchase-state__mark" aria-hidden="true">{tone === 'loading' ? '···' : tone === 'error' ? '!' : '—'}</span>
        <span className="purchase-state__eyebrow">资源配置</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="purchase-state__actions">
          {onRetry && <Button variant="primary" onClick={onRetry}>重试</Button>}
          {tone !== 'loading' && <Button variant="secondary" onClick={onReturn}>返回资源商城</Button>}
        </div>
      </Container>
    </section>
  );
}
