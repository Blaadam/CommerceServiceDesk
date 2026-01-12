import Client from "./client";
import 'dotenv/config'
import * as Sentry from "@sentry/node";

import { databaseConnection } from "./database";
const connection = new databaseConnection();

const BOT_SECRET = process.env.BOT_SECRET;

process.on('unhandledRejection', (reason) => {
	console.error('Unhandled Promise Rejection:', reason);
});

async function start() {
	if (!BOT_SECRET) {
		console.error('Missing BOT_SECRET environment variable — exiting');
		process.exit(1);
	}

	try {
		const client = new Client();
		await client.login(BOT_SECRET);
		console.info('Discord client logged in');
	} catch (err) {
		console.error('Failed to login Discord client:', err);
		process.exit(1);
	}
}

start();

function cleanup() {
	connection.cleanup();
	Sentry.flush(1_000)
}

process.on("exit", cleanup);
process.on('uncaughtException', (err) => {
	console.error('Uncaught exception:', err);
	cleanup();
	process.exit(1);
});
