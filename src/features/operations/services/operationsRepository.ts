import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type {
  CreateOperationInput,
  PlatformOperationRecord,
} from '../types';

const STORAGE_KEY = 'computing-platform:operations';
const VERSION = 1;

const INITIAL_RECORDS: readonly PlatformOperationRecord[] = [
  {
    id: 'operation-seed-resource-start',
    module: 'resource',
    action: '启动资源',
    targetId: 'cs-east-001',
    targetName: '研发计算节点',
    actor: '当前用户',
    createdAt: '2026-07-21T08:20:00.000Z',
    status: 'completed',
    message: '资源启动操作已完成。',
    targetPath: '/resources/cloud-servers/cs-east-001',
  },
];

function isOperation(value: unknown): value is PlatformOperationRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PlatformOperationRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.module === 'string' &&
    typeof record.action === 'string' &&
    typeof record.targetId === 'string' &&
    typeof record.targetName === 'string' &&
    record.actor === '当前用户' &&
    typeof record.createdAt === 'string' &&
    typeof record.status === 'string' &&
    typeof record.message === 'string'
  );
}

function readRecords() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is PlatformOperationRecord[] =>
      Array.isArray(value) && value.every(isOperation),
    () => [...INITIAL_RECORDS],
  );
}

function writeRecords(records: readonly PlatformOperationRecord[]) {
  writeVersionedState(STORAGE_KEY, VERSION, records);
}

export function listOperationRecords() {
  return [...readRecords()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function recordOperation(
  input: CreateOperationInput,
): PlatformOperationRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const record: PlatformOperationRecord = {
    ...input,
    id: `operation-${createdAt.replace(/\D/g, '')}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    actor: '当前用户',
    createdAt,
  };
  writeRecords([record, ...readRecords()]);
  return record;
}

export function getOperationsForTarget(targetId: string) {
  return listOperationRecords().filter((record) => record.targetId === targetId);
}

export function resetOperationsRepository() {
  removeVersionedState(STORAGE_KEY);
}
