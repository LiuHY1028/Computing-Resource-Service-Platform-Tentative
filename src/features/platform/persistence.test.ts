import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from './persistence';

const KEY = 'persistence-test';
const isValue = (value: unknown): value is { count: number } =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { count?: unknown }).count === 'number',
  );

afterEach(() => {
  vi.restoreAllMocks();
  removeVersionedState(KEY);
});

describe('optional browser persistence', () => {
  it('uses memory state when localStorage access throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Unavailable', 'SecurityError');
    });

    expect(
      readVersionedState(KEY, 1, isValue, () => ({ count: 1 })),
    ).toEqual({ count: 1 });
    writeVersionedState(KEY, 1, { count: 2 });
    expect(
      readVersionedState(KEY, 1, isValue, () => ({ count: 0 })),
    ).toEqual({ count: 2 });
  });

  it('keeps memory updates when localStorage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    writeVersionedState(KEY, 1, { count: 3 });
    expect(
      readVersionedState(KEY, 1, isValue, () => ({ count: 0 })),
    ).toEqual({ count: 3 });
  });
});
