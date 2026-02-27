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
		blm: "#6c584b",
		noyra: "#5470c8",
		default: "#0070a0",
		error: "#ff0000",
		success: "#00ff00",
	},
	accentColors: {
		mgmt: 0xf6ca43,
		activity: 0x00597f,
		blm: 0x6c584b,
		noyra: 0x5470c8,
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
	// devSupportTickets: "1445046543316025576", // commerce service desk channel in noyra
	devSupportTickets: "1433519872209322196",
	devSupportTextTickets: "1096981698052370532",
	rolesChannel: "735894843259355288",
	blmRevokeLand: "1089647073852403802",
	publicAds: "735894843259355293",
	docmAnnouncements: "735894843259355289",
};

global.RoleIDs = {
	v2Devs: "1410028851110740029",
	docm_fsLeadership: "1025174786101485588",
	docm_fsDeveloper: "1096981386574966885",
	docm_lm_notif_opt: "1164856752181870642",
	noyra_seniorMgmt: "1200919958146793532",
};

global.GuildIDs = {
	mainServer: process.env.MAIN_GUILD_ID,
	supportServer: "1200919106266861598",
}

//// END OF CONFIGURATION ////

const defaultGuilds = [...new Set(Object.values(global.GuildIDs).filter((id): id is string => typeof id === 'string'))]
ApplicationCommandRegistries.setDefaultGuildIds(defaultGuilds);
