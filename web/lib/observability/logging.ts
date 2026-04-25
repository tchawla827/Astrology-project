type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, boolean | number | string | null | undefined>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return { message: String(error) };
}

function write(level: LogLevel, message: string, fields: LogFields = {}, error?: unknown) {
  const payload = {
    level,
    message,
    service: "astri-web",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    ...fields,
    error: error === undefined ? undefined : serializeError(error),
  };

  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(payload));
    return;
  }

  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](message, payload);
}

export function logInfo(message: string, fields?: LogFields) {
  write("info", message, fields);
}

export function logWarn(message: string, fields?: LogFields) {
  write("warn", message, fields);
}

export function captureException(error: unknown, fields?: LogFields) {
  write("error", "exception", fields, error);
}
