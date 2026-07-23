export type VersionedEnvelope<T> = Readonly<{ version: number; data: T }>;

const memoryState = new Map<string, unknown>();

function createFallback<T>(key: string, fallback: () => T) {
  const value = fallback();
  memoryState.set(key, value);
  return value;
}

export function readVersionedState<T>(
  key: string,
  version: number,
  validate: (value: unknown) => value is T,
  fallback: () => T,
): T {
  const cached = memoryState.get(key);
  if (validate(cached)) return cached;

  try {
    const storage = window.localStorage;
    if (typeof storage?.getItem !== 'function') {
      return createFallback(key, fallback);
    }
    const raw = storage.getItem(key);
    if (!raw) return createFallback(key, fallback);
    const parsed = JSON.parse(raw) as Partial<VersionedEnvelope<unknown>>;
    if (parsed.version !== version || !validate(parsed.data)) {
      try {
        storage.removeItem?.(key);
      } catch {
        // Optional persistence failures never block the in-memory application.
      }
      return createFallback(key, fallback);
    }
    memoryState.set(key, parsed.data);
    return parsed.data;
  } catch {
    return createFallback(key, fallback);
  }
}

export function writeVersionedState<T>(key: string, version: number, data: T) {
  memoryState.set(key, data);
  const envelope: VersionedEnvelope<T> = { version, data };
  try {
    const storage = window.localStorage;
    if (typeof storage?.setItem === 'function') {
      storage.setItem(key, JSON.stringify(envelope));
    }
  } catch {
    // Memory state remains authoritative when browser persistence is unavailable.
  }
}

export function removeVersionedState(key: string) {
  memoryState.delete(key);
  try {
    window.localStorage?.removeItem?.(key);
  } catch {
    // Resetting the in-memory copy is sufficient.
  }
}
