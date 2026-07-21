type LogContext = Record<string, unknown>;

function log(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString()
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context)
};
