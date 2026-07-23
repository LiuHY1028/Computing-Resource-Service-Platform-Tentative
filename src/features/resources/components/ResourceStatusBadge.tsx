import { RESOURCE_STATUS_LABELS } from '../formatters';
import type { ResourceStatus } from '../types';

export function ResourceStatusBadge({
  status,
}: Readonly<{ status: ResourceStatus }>) {
  return (
    <span className="resource-status-badge" data-status={status}>
      <span className="resource-status-badge__mark" aria-hidden="true" />
      {RESOURCE_STATUS_LABELS[status]}
    </span>
  );
}
