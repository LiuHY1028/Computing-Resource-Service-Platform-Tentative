import type { ReactNode } from 'react';
import {
  Container,
  FormAnchorNav,
  Grid,
  GridItem,
  type FormAnchorItem,
} from '../../../components/ui';
import type { MarketplaceResourceType } from '../../marketplace';

type PurchasePageLayoutProps = Readonly<{
  resourceType: MarketplaceResourceType;
  title: string;
  description: string;
  anchors: readonly FormAnchorItem[];
  children: ReactNode;
  summary: ReactNode;
  liveMessage?: string;
}>;

export function PurchasePageLayout({
  resourceType,
  title,
  description,
  anchors,
  children,
  summary,
  liveMessage = '',
}: PurchasePageLayoutProps) {
  return (
    <section className="purchase-page" data-resource-type={resourceType} aria-label={title}>
      <header className="purchase-page__header">
        <span>RESOURCE CONFIGURATOR · 资源配置</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <Container as="section" className="purchase-config-notice" aria-label="配置说明">
        <span aria-hidden="true">i</span>
        <p><strong>配置说明</strong> · {description}</p>
      </Container>

      <Grid className="purchase-workspace">
        <GridItem span={16} className="purchase-workspace__form">
          {children}
        </GridItem>
        <GridItem span={8} className="purchase-workspace__rail">
          <div className="purchase-sticky-rail">
            <FormAnchorNav
              className="purchase-anchor-nav"
              items={anchors}
              label="配置分区快速导航"
            />
            {summary}
          </div>
        </GridItem>
      </Grid>
      <p className="ui-visually-hidden" aria-live="polite">
        {liveMessage}
      </p>
    </section>
  );
}
