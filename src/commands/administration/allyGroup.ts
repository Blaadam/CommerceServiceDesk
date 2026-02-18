import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	EmbedBuilder,
	PermissionFlagsBits,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

import Sentry from "@sentry/node";
import { SentryHelper } from "../../shared/sentry-utils";
// import { rocloud, rocloudTypes } from "../../rocloud";

// const rocloudInstance = new rocloud();

const ADDON = `&key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;

async function FetchCardInfo(cardId: string, span?: Sentry.Span) {
	const url = `https://api.trello.com/1/cards/${cardId}?fields=name,desc`;
	span?.setAttribute("trello.fetch_card_url", url);

	const response = await fetch(url + ADDON, {
		method: 'GET',
		headers: { "Content-Type": "application/json" }
	})

	return response.json();
}

@ApplyOptions<Command.Options>({
	name: "ally-group",
	description: "Ally your group with Commerce",
	cooldownDelay: 1_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.addStringOption(option =>
					option.setName('permit')
						.setDescription('The business name of the permit to retrieve')
						.setRequired(true)
						.setAutocomplete(true));
		}, {
			guildIds: [],
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		return interaction.reply({ content: "This command is currently disabled while roblox doesnt yet support group apply requests under the open cloud API.", flags: ["Ephemeral"] });

		// await interaction.deferReply({ flags: ["Ephemeral"], });

		// return SentryHelper.tracer(interaction, {
		// 	name: "Ally Group Command",
		// 	op: "command.allyGroup",
		// }, async (span: Sentry.Span) => {
		// 	const permit: string = interaction.options.getString("permit", true);
		// 	const card_id: string | null = permit.match(/\/c\/([a-zA-Z0-9]+)/)?.[1] ?? null;

		// 	span.setAttribute("permit.url", permit);
		// 	span.setAttribute("permit.card_id", card_id ?? "none");

		// 	if (!card_id) {
		// 		return interaction.editReply("Invalid permit URL provided. Please ensure you are providing a valid Trello card URL.");
		// 	}

		// 	const card_info = await FetchCardInfo(card_id, span);
		// 	if (!card_info || card_info.error) {
		// 		span.setStatus({code: 2, message: "Failed to fetch card info from Trello"});
		// 		span.setAttribute("trello.fetch_card_error", JSON.stringify(card_info));
		// 		return interaction.editReply("Failed to fetch permit information from Trello. Please ensure the card ID is correct and the bot has access to the card.");
		// 	}
		// 	const card_desc: string = card_info.desc

		// 	const group_id_match = card_desc.match(/https?:\/\/www\.roblox\.com\/(?:groups|communities)\/\d+/)
		// 	if (!group_id_match) {
		// 		span.setStatus({code: 2, message: "Failed to extract group ID from card description"});
		// 		return interaction.editReply("Failed to extract group ID from the permit information. Please ensure the Trello card description contains a valid Roblox group URL.");
		// 	}

		// 	const group_url = group_id_match[0];
		// 	span.setAttribute("permit.group_url", group_url);

		// 	if (!group_url) {
		// 		span.setStatus({code: 2, message: "Group URL not found in card description"});
		// 		return interaction.editReply("No Roblox group URL found in the permit information. Please ensure the Trello card description contains a valid Roblox group URL.");
		// 	}

		// 	const group_id = group_url.match(/\/(\d+)/)?.[1];
		// 	span.setAttribute("permit.group_id", group_id ?? "none");

		// 	if (!group_id) {
		// 		span.setStatus({code: 2, message: "Failed to extract group ID from group URL"});
		// 		return interaction.editReply("Failed to extract group ID from the Roblox group URL. Please ensure the URL is in the correct format.");
		// 	}

		// 	const ally_response = await rocloudInstance.CreateGroupRelationship("2808791", rocloudTypes.groupRelationshipType.Allies, group_id);
		// 	console.log(ally_response)
		// 	return interaction.editReply(JSON.stringify(ally_response, null, 2));
		// });
	}
}
