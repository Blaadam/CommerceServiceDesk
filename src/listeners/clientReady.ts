import { Container, Listener } from "@sapphire/framework";
import { ActivityType, ButtonBuilder, ContainerBuilder, DMChannel, User, type Client } from "discord.js";
import Sentry from "@sentry/node";
import { promises } from "fs"
import { retrieveBacklog } from "../shared/retrieve-backlog";
import { checkIsReadyForDeadlineAnnouncement, create_deadline_announcement } from "../shared/property-deadlines";
import { check_blm_trello_for_updates } from "../shared/trello-listener";
const path = require('path');

const NODE_ENV: string = process.env.NODE_ENV ?? "development";

const WEEKLY_CHECK_FILE = '/app/data/weeklyCheck.json';
const MINIMUM_CHECK_THRESHHOLD_DAYS = 2;

const templateMessage = `

# CSD | SLA Breach Notice

Dear Developer,

This is an SLA Breach Notice from the Commerce Service Desk.

Current number of open requests: **FORMAT_NUMBER_OF_REQUESTS**

You can view and track all open requests via the following channel:
> FORMAT_LINK_TO_CHANNEL

You can view and track all open alternative text-based requests via the following channel:
> <#${global.ChannelIDs.devSupportTextTickets}>


SLA follows me everywhere,

Commerce Service Desk
Queue Manager / Artūrs
-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM

`

function setStatus(client: Client, container: Container) {
	if (NODE_ENV === "production") {
		client.user.setActivity("out for illegal business operations", { type: ActivityType.Watching });
		client.user.setStatus('idle')
	} else {
		client.user.setActivity("under maintenance, please avoid using this service", { type: ActivityType.Custom });
		client.user.setStatus('dnd')

		const guilds: string = client.guilds.cache.map(guild => `${guild.name} (${guild.id})`).join(", ");
		container.logger.info(
			`Currently in ${client.guilds.cache.size} servers: ${guilds}`
		);
	}
}

async function checkWeeklyMonday() {
	const now = new Date();
	if (now.getDay() != 1 || now.getHours() < 12) {
		return false;
	}

	try {
		const data = await promises.readFile(WEEKLY_CHECK_FILE, 'utf-8');
		const { timestamp } = JSON.parse(data);
		const lastCheckDate = new Date(timestamp);
		const daysSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24);

		if (daysSinceLastCheck >= MINIMUM_CHECK_THRESHHOLD_DAYS) {
			return true;
		}
		return false;
	} catch (error) {
		console.log("No previous check found or error reading file, proceeding with check.");
		console.warn(error)
		// return true;
	}

	return true;
}

async function logWeek(usersMessaged: User[]) {
	const now = new Date();
	const logEntry = {
		timestamp: now.toISOString(),
		usersMessaged: usersMessaged.map(user => ({ id: user.id, tag: user.tag }))
	};

	await promises.mkdir(path.dirname(WEEKLY_CHECK_FILE), { recursive: true });
	await promises.writeFile(WEEKLY_CHECK_FILE, JSON.stringify(logEntry) + '\n');
}

const SEARCH_ROLE_IDS = [
	// global.RoleIDs.v2Devs,
	// global.RoleIDs.docm_fsLeadership,
	// global.RoleIDs.docm_fsDeveloper,
	// global.RoleIDs.noyra_seniorMgmt,
	"1200919816811331807" // Noyra CTO
]

async function runWeeklyCheck(client: Client, container: Container) {
	const timeForCheck = await checkWeeklyMonday();
	if (!timeForCheck) {
		return;
	}

	// check for users with a role across all guilds
	const usersToMessage: User[] = [];
	for (const guild of client.guilds.cache.values()) {
		await guild.members.fetch(); // fetch all members to ensure roles are available
		const membersWithRoles = guild.members.cache.filter(member =>
			member.roles.cache.some(role => SEARCH_ROLE_IDS.includes(role.id))
		);
		usersToMessage.push(...membersWithRoles.map(member => member.user));
	}

	// eliminate duplicate users
	const uniqueUsersToMessage = Array.from(new Set(usersToMessage.map(user => user.id)))
		.map(id => usersToMessage.find(user => user.id === id)) as User[];

	const backlog = await retrieveBacklog(client);
	const backlog_size = backlog.size;

	if (backlog_size === 0) {
		container.logger.info("No open requests in backlog, skipping weekly check messaging.");
		return;
	}

	container.logger.info(`Messaging ${uniqueUsersToMessage.length} users about the backlog of ${backlog_size} requests.`);

	const messageContainer = new ContainerBuilder()
		.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(templateMessage.trim()
				.replace("FORMAT_NUMBER_OF_REQUESTS", backlog_size.toString())
				.replace("FORMAT_LINK_TO_CHANNEL", `<#${global.ChannelIDs.devSupportTickets}>`))
		)
		.addActionRowComponents((actionRow) =>
			actionRow.addComponents(
				new ButtonBuilder()
					.setLabel("View Open Requests")
					.setStyle(5) // Link style
					.setURL(`https://discord.com/channels/962005830960562216/1433519872209322196`),
				new ButtonBuilder()
					.setLabel("View Text-Based Requests")
					.setStyle(5) // Link style
					.setURL(`https://discord.com/channels/735894836577697913/1096981698052370532`),
				new ButtonBuilder()
					.setLabel("Support Server")
					.setStyle(5) // Link style
					.setURL(`https://discord.gg/5SdTjEKCdM`),
			)
		);

	// message users telling them about the length of a backlog
	for (const user of uniqueUsersToMessage) {
		try {
			const dmChannel: DMChannel = user.dmChannel ?? await user.createDM();
			await dmChannel.send({
				components: [messageContainer],
				flags: ["IsComponentsV2"]
			});
		} catch (error) {
			container.logger.error(`Failed to send message to ${user.tag}:`, error);
			Sentry.captureException(error);
		}
	}

	await logWeek(uniqueUsersToMessage);
}

export class ClientReadyListener extends Listener {
	public run(client: Client) {
		const { tag } = client.user!;
		this.container.logger.info(
			`Ready! Logged in as ${tag}`
		);

		setStatus(client, this.container);

		const updatePingLatencyMetric = () => {
			const ping = Math.round(this.container.client.ws.ping ?? 0);
			Sentry.metrics.distribution('client.ws.ping', ping);
		}

		updatePingLatencyMetric();
		setInterval(updatePingLatencyMetric, 15_000);

		setInterval(async () => {
			try {
				await runWeeklyCheck(client, this.container);
			}
			catch (error) {
				this.container.logger.error("Error during weekly check:", error);
				Sentry.captureException(error);
			}
		}, 60_000);

		setInterval(async () => {
			try {
				const isReady = await checkIsReadyForDeadlineAnnouncement();
				if (isReady) {
					create_deadline_announcement(client);
					this.container.logger.info("Deadline announcement created successfully.");
				}
			}
			catch (error) {
				this.container.logger.error("Error during deadline announcement check:", error);
				Sentry.captureException(error);
			}
		}, 90_000);

		setInterval(async () => {
			try {
				await check_blm_trello_for_updates(client);
			}
			catch(error) {
				this.container.logger.error("Error during Trello check:", error);
				Sentry.captureException(error);
			}
		}, 300_000);
	}
}
