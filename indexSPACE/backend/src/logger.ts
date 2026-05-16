import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

type LogLevel = "info" | "warn" | "error";

interface LoggerConfig {
  enabled: boolean;
  path: string;
}

let loggerConfig: LoggerConfig = {
  enabled: false,
  path: "run.log",
};

function stringifyError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return err;
}

export function configureRunLogger(enabled: boolean, path: string) {
  loggerConfig = { enabled, path };
  if (!enabled) return;
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
}

export function logRuntime(
  category: string,
  message: string,
  details?: Record<string, unknown>,
  level: LogLevel = "info",
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    category,
    message,
    ...(details ? { details } : {}),
  };

  if (level === "error") {
    console.error(`[${category}] ${message}`, details ?? "");
  } else if (level === "warn") {
    console.warn(`[${category}] ${message}`, details ?? "");
  } else {
    console.log(`[${category}] ${message}`, details ?? "");
  }

  if (!loggerConfig.enabled) return;

  const resolved = resolve(loggerConfig.path);
  const serialized = JSON.stringify(entry, (_key, value) => {
    if (value instanceof Error) return stringifyError(value);
    return value;
  });
  appendFileSync(resolved, `${serialized}\n`);
}

export function logError(category: string, message: string, err: unknown, details?: Record<string, unknown>) {
  logRuntime(
    category,
    message,
    {
      ...details,
      error: stringifyError(err),
    },
    "error",
  );
}
