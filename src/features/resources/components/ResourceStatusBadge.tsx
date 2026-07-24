import { StatusBadge, type StatusBadgeTone } from '../../../components/ui';
import { RESOURCE_STATUS_LABELS } from '../formatters';
import type { ResourceStatus } from '../types';

const TONES: Readonly<Record<ResourceStatus, StatusBadgeTone>> = {
  creating: 'info',
  running: 'success',
  stopped: 'neutral',
  preparing: 'info',
  'powered-off': 'neutral',
  restarting: 'info',
  resizing: 'info',
  maintenance: 'warning',
  expiring: 'warning',
  abnormal: 'error',
  expired: 'error',
  releasing: 'warning',
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
