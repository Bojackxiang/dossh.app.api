import "dotenv/config";
import * as Sentry from "@sentry/node";

console.log("[Sentry] DSN present:", Boolean(process.env.SENTRY_DSN));

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Send structured logs to Sentry
  enableLogs: true,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});