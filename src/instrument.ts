import * as Sentry from "@sentry/node";
import { version } from "./version";
import 'dotenv/config'

// Force 1.0 if the env var is missing or invalid
const RAW_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE ?? "1.0";
const SAMPLE_RATE = RAW_SAMPLE_RATE ? parseFloat(RAW_SAMPLE_RATE) : 1.0;

// Ensure to call this before requiring any other modules!
Sentry.init({
  initialScope: {
    tags: { "bot.version": version }
  },

  beforeSendSpan(span) {
    span.data = {
      ...span.data,
      "bot.version": version,
    }

    return span;
  },

  // debug: true,
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  release: `csd-bot@${version}`,
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    Sentry.prismaIntegration(),
  ],

  tracesSampleRate: 1.0,
  // tracesSampleRate: SAMPLE_RATE,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  enableLogs: true,
});