export const DATA_MODES = ['fixture', 'api'] as const;

export type DataMode = (typeof DATA_MODES)[number];

export const DEFAULT_DATA_MODE: DataMode = 'fixture';

type InvalidModeReporter = (message: string) => void;

export function resolveDataMode(
  rawMode: string | undefined,
  reportInvalidMode: InvalidModeReporter = console.warn,
): DataMode {
  if (!rawMode) {
    return DEFAULT_DATA_MODE;
  }

  if (DATA_MODES.some((mode) => mode === rawMode)) {
    return rawMode as DataMode;
  }

  reportInvalidMode(
    `Unsupported VITE_DATA_MODE "${rawMode}". Falling back to "${DEFAULT_DATA_MODE}".`,
  );
  return DEFAULT_DATA_MODE;
}

export const runtimeConfig = Object.freeze({
  dataMode: resolveDataMode(import.meta.env.VITE_DATA_MODE),
});
