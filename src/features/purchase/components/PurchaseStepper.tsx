import { CheckIcon } from '../../../components/ui';
import type { PurchaseStepId } from '../types';

const STEPS: readonly Readonly<{
  id: PurchaseStepId;
  label: string;
}>[] = [
  { id: 'configuration', label: '配置' },
  { id: 'confirmation', label: '确认订单' },
  { id: 'payment', label: '支付' },
];

const STEP_INDEX: Readonly<Record<PurchaseStepId, number>> = {
  configuration: 0,
  confirmation: 1,
  payment: 2,
};

export type PurchaseStepperProps = Readonly<{
  currentStep: PurchaseStepId;
  onStepChange?: (step: PurchaseStepId) => void;
  readonlyMode?: boolean;
}>;

export function PurchaseStepper({
  currentStep,
  onStepChange,
  readonlyMode = false,
}: PurchaseStepperProps) {
  const currentIndex = STEP_INDEX[currentStep];
  return (
    <nav className="purchase-stepper" aria-label="购买进度">
      <ol>
        {STEPS.map((step, index) => {
          const state =
            index < currentIndex
              ? 'complete'
              : index === currentIndex
                ? 'current'
                : 'upcoming';
          const canVisit =
            Boolean(onStepChange) &&
            (readonlyMode ? index <= currentIndex : index < currentIndex);
          return (
            <li key={step.id} data-state={state}>
              <button
                type="button"
                aria-current={state === 'current' ? 'step' : undefined}
                disabled={!canVisit}
                title={state === 'upcoming' ? '完成当前步骤后可进入' : undefined}
                onClick={() => canVisit && onStepChange?.(step.id)}
              >
                <span className="purchase-stepper__marker" aria-hidden="true">
                  {state === 'complete' ? <CheckIcon /> : index + 1}
                </span>
                <span>
                  <strong>{step.label}</strong>
                  <small>
                    {state === 'complete'
                      ? '已完成'
                      : state === 'current'
                        ? '当前步骤'
                        : '尚未开始'}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
