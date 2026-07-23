export type VersionedEnvelope<T> = Readonly<{ version: number; data: T }>;

export function readVersionedState<T>(
  key: string,
  version: number,
  validate: (value: unknown) => value is T,
  fallback: () => T,
): T {
  try {
    const storage = window.localStorage;
    if (typeof storage?.getItem !== 'function') return fallback();
    const raw = storage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as Partial<VersionedEnvelope<unknown>>;
    if (parsed.version !== version || !validate(parsed.data)) {
      storage.removeItem?.(key);
      return fallback();
    }
    return parsed.data;
  } catch {
    if (typeof window.localStorage?.removeItem === 'function') {
      window.localStorage.removeItem(key);
    }
    return fallback();
  }
}

export function writeVersionedState<T>(key: string, version: number, data: T) {
  const envelope: VersionedEnvelope<T> = { version, data };
  if (typeof window.localStorage?.setItem === 'function') {
    window.localStorage.setItem(key, JSON.stringify(envelope));
  }
}

export function removeVersionedState(key: string) {
  window.localStorage?.removeItem?.(key);
}
