import {
	SapphireClient,
	LogLevel,
	ApplicationCommandRegistries,
	RegisterBehavior,
} from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";

export default class Client extends SapphireClient {
	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.DirectMessages,
			],
			logger: {
				level: LogLevel.Info,
			},
		});
	}

	public override login(token?: string) {
		ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
			RegisterBehavior.BulkOverwrite
		);

		return super.login(token);
	}
}

//// CONFIGURATION ////

global.embeds = {
	embedColors: {
		mgmt: "#f6ca43",
		activity: "#00597f",
		default: "#0070a0",
		error: "#ff0000",
		success: "#00ff00",
	},
	accentColors: {
		mgmt: 0xf6ca43,
		activity: 0x00597f,
		default: 0x0070a0,
		error: 0xff0000,
		success: 0x00ff00,
	},
	embedFooter: {
		text: "Service Management Centre",
		iconURL:
			"https://media.discordapp.net/attachments/1444400912054354143/1444400974000291880/Noyra_DOCM-SD_pfp.png",
	},
};

global.ChannelIDs = {
	deadlineAnnouncements: "735894843259355294",
	landSubmissions: "1089647073852403802",
	devSupportTickets: "1433519872209322196",
	rolesChannel: "735894843259355288",
	blmRevokeLand: "1089647073852403802",
};

global.mainServer = process.env.MAIN_GUILD_ID;

//// END OF CONFIGURATION ////

ApplicationCommandRegistries.setDefaultGuildIds([global.mainServer]);
