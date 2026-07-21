import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DATA_MODE, resolveDataMode } from './runtime';

describe('runtime data mode', () => {
  it('uses the mock mode by default', () => {
    expect(resolveDataMode(undefined)).toBe(DEFAULT_DATA_MODE);
    expect(DEFAULT_DATA_MODE).toBe('mock');
  });

  it('falls back safely when the mode is invalid', () => {
    const reporter = vi.fn();

    expect(resolveDataMode('unsupported', reporter)).toBe(DEFAULT_DATA_MODE);
    expect(reporter).toHaveBeenCalledOnce();
  });
});
