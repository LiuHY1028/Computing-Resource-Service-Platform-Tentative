import type { ReactNode } from 'react';
import {
  FormAnchorNav,
  Grid,
  GridItem,
  type FormAnchorItem,
} from '../../../components/ui';
import type { MarketplaceResourceType } from '../../marketplace';
import type { PurchaseStepId } from '../types';
import { PurchaseStepper } from './PurchaseStepper';

type PurchasePageLayoutProps = Readonly<{
  resourceType: MarketplaceResourceType;
  title: string;
  description: string;
  anchors: readonly FormAnchorItem[];
  children: ReactNode;
  summary: ReactNode;
  liveMessage?: string;
  currentStep?: PurchaseStepId;
  onStepChange?: (step: PurchaseStepId) => void;
}>;

export function PurchasePageLayout({
  resourceType,
  title,
  description,
  anchors,
  children,
  summary,
  liveMessage = '',
  currentStep = 'configuration',
  onStepChange,
}: PurchasePageLayoutProps) {
  return (
    <section className="purchase-page" data-resource-type={resourceType} aria-label={title}>
      <header className="purchase-page__header">
        <span>RESOURCE CONFIGURATOR · 商品配置</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <PurchaseStepper currentStep={currentStep} onStepChange={onStepChange} />

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
