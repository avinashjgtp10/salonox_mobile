const startupMarks: Record<string, number> = {};
const startupDurations: Record<string, number> = {};

const now = () =>
  typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();

export const markStartup = (name: string) => {
  startupMarks[name] = now();
};

export const logStartupDuration = (label: string, start: number, details?: Record<string, unknown>) => {
  const durationMs = Math.round(now() - start);
  startupDurations[label] = durationMs;

  console.info(`[Startup] ${label}`, {
    durationMs,
    ...details,
  });

  const bottleneck = Object.entries(startupDurations).sort(([, left], [, right]) => right - left)[0];

  if (bottleneck) {
    console.info("[Startup] Current bottleneck", {
      durationMs: bottleneck[1],
      label: bottleneck[0],
    });
  }

  return durationMs;
};

export const logStartupSince = (label: string, markName: string, details?: Record<string, unknown>) => {
  const start = startupMarks[markName];

  if (start === undefined) {
    return null;
  }

  return logStartupDuration(label, start, details);
};

export const timeStartup = async <T>(
  label: string,
  task: () => Promise<T>,
  details?: Record<string, unknown>,
) => {
  const start = now();

  try {
    return await task();
  } finally {
    logStartupDuration(label, start, details);
  }
};
