import { StatusBadge, type StatusBadgeTone } from '../../../components/ui';
import { RESOURCE_STATUS_LABELS } from '../formatters';
import type { ResourceStatus } from '../types';

const TONES: Readonly<Record<ResourceStatus, StatusBadgeTone>> = {
  running: 'success',
  stopped: 'neutral',
  preparing: 'info',
  operating: 'info',
  abnormal: 'error',
  expired: 'error',
};

export function ResourceStatusBadge({
  status,
}: Readonly<{ status: ResourceStatus }>) {
  return (
    <StatusBadge tone={TONES[status]} data-status={status}>
      {RESOURCE_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
