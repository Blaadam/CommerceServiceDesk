import Sentry from "@sentry/node";
import { version } from "./version";
import 'dotenv/config'

const RAW_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE ?? "1.0";
const SAMPLE_RATE = RAW_SAMPLE_RATE ? parseFloat(RAW_SAMPLE_RATE) : 1.0;

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

	dsn: process.env.SENTRY_DSN || "",
	environment: process.env.NODE_ENV || "development",
	release: `csd-bot@${version}`,
	integrations: [
		Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
		Sentry.prismaIntegration(),
	],

	tracesSampleRate: 1.0,
	// tracesSampleRate: SAMPLE_RATE,

	sendDefaultPii: true,
	enableLogs: true,
});