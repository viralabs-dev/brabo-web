import type { ContainerLifecycleStatus } from '../lib/api-types';

import { type BadgeTone } from './ui/Badge';

export const TOM_DO_STATUS: Record<ContainerLifecycleStatus, BadgeTone> = {
  provisioning: 'warning',
  running: 'success',
  stopped: 'muted',
  failed: 'danger',
  removed: 'muted',
};
