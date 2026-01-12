import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Channel,
	EmbedBuilder,
	TextChannel,
	type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
import axios from "axios";
import * as Sentry from "@sentry/node";

import { databaseConnection } from "../../database";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils.ts";
const connection = new databaseConnection();

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const ADDON = `?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

const ACTIVE_LIST_ID = "641e10486e814e91bb2f6d31"

async function CommentOnTrelloCardID(cardId: string, comment: string, span?: Sentry.Span) {
	const url = `https://api.trello.com/1/cards/${cardId}/actions/comments`

	span?.setAttribute("trello.comment_url", url);
	span?.setAttribute("trello.card_id", cardId);

	const response = await axios({
		"method": 'post',
		"url": url+ADDON,
		data: {
			"text": comment
		},
		headers: { "Content-Type": "application/json" }
	})

	return response.data
}

async function FindTrelloCardFromName(query: string, span?: Sentry.Span) {
	const url: string = "https://api.trello.com/1/search"
	const idBoards: string[] = ["641e058f71db0c8ed6abecd7"]

	span?.setAttribute("trello.search_url", url);
	span?.setAttribute("trello.search_boards", idBoards.join(","));

	const response = await axios({
		"method": 'get',
		"url": url + ADDON,
		params: {
			query: query,
			idBoards: idBoards,
			modelTypes: "cards",
			card_fields: "name,shortUrl,closed,idList",
			cards_limit: 5
		},
		headers: { "Content-Type": "application/json" }
	})

	if (response.data.cards.length == 0) return null

	// find first card that isnt archived
	let card
	for (let i = 0; i < response.data.cards.length; i++) {
		if (response.data.cards[i].idList == ACTIVE_LIST_ID && !response.data.cards[i].closed) {
			card = response.data.cards[i]
			break;
		}
	}

	return card;
}

function SpliceUsername(Username: string): string {
	const Spliced = Username.split(" ")
	return Spliced[Spliced.length - 1]
}

// Grabs the manager for a district
async function GetManagersFromDistrict(district: string) {
	const table = connection.prisma.managerTable
	const rows = await table.findMany({ where: { District: district } });
	return rows;
}

@ApplyOptions({
	name: "activity-modal",
})
export class ModalHandler extends InteractionHandler {
	public constructor(
		ctx: InteractionHandler.LoaderContext,
		options: InteractionHandler.Options
	) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
		});
	}

	public override parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId !== this.name) return this.none();

		return this.some();
	}

	public async run(interaction: ModalSubmitInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		const businessName: string = interaction.fields.getTextInputValue("businessName");
		const propertyDistrict: readonly string[] = interaction.fields.getStringSelectValues("propertyDistrict");
		const propertyActivity: string = interaction.fields.getTextInputValue("propertyActivity");
		const additionalInformation: string = interaction.fields.getTextInputValue("additionalInformation");

		return SentryHelper.tracer(interaction, {
			name: "Property Activity Modal Submission",
			op: "property.activity_modal",
			attributes: { "modal.custom_id": interaction.customId }
		}, async (span) => {
			span.setAttribute("user.id", interaction.user.id);
			span.setAttribute("user.tag", interaction.user.tag);
			span.setAttribute("business.name", businessName);

			if (!businessName || !propertyDistrict || !propertyActivity) {
				Sentry.logger.info("Validation failed: missing required fields", { businessName, propertyDistrict, propertyActivity });
				span.setStatus({ code: 2, message: "missing_fields" });
				return interaction.editReply({
					content: "Required fields are missing."
				});
			}

			const robloxName: string = SpliceUsername(interaction.user.displayName);
			span.setAttribute("user.roblox_name", robloxName);
			Sentry.logger.info(`Derived roblox name: ${robloxName}`);

			const District: string = propertyDistrict[0]; // Assuming string from modal
			span.setAttribute("property.district", District);
			Sentry.logger.info(`Selected district: ${District}`);

			if (!District) {
				Sentry.logger.info("Invalid district provided", { District });
				span.setStatus({ code: 2, message: "invalid_district" });
				return interaction.editReply({
					content: `The district \`\`${District}\`\` is not valid. Please use one of the following districts: \`Redwood\`, \`Arborfield\`, \`Prominence\`, or \`Unincorporated\`.`,
				});
			}

			Sentry.logger.info("Fetching district managers", { District });
			const DistrictManagers = await Sentry.startSpan({
				name: "Get District Managers",
				op: "db.prisma"
			}, async (childSpan) => {
				try {
					const managers = await GetManagersFromDistrict(District);
					childSpan.setStatus({ code: 1 });
					Sentry.logger.info("Fetched district managers", { count: managers?.length ?? 0 });
					return managers;
				} catch (err) {
					Sentry.logger.info("Error fetching district managers", { message: (err as Error).message });
					span.setStatus({ code: 2, message: "db_error" });
					span.setAttribute("error.message", (err as Error).message);

					childSpan.setStatus({ code: 2 });
					Sentry.captureException(err);
					return null;
				}
			});

			if (!DistrictManagers?.length) {
				Sentry.logger.info("No district managers found", { District });
				span.setAttribute("command.status_reason", "no_managers_found");
				return interaction.editReply({
					content: `Unable to find district manager for ${District}.`
				});
			}

			const query: string = `${District} ${businessName}`;
			span.setAttribute("trello.search_query", query);
			Sentry.logger.info("Searching Trello for card", { query });

			const ExistingCard = await Sentry.startSpan({
				name: "Trello: Find Card by Name",
				op: "axios.trello.search",
				attributes: { "trello.query": query }
			}, async (childSpan) => {
				const card = await FindTrelloCardFromName(query, childSpan);
				childSpan.setStatus({ code: card ? 1 : 2 });
				Sentry.logger.info(card ? "Trello card found" : "Trello card not found", { cardId: card?.id, query });
				return card;
			});

			if (!ExistingCard) {
				Sentry.logger.info("No Trello card matched search query", { query });
				span.setAttribute("command.status_reason", "no_trello_card_found");
				return interaction.editReply({
					content: `Unable to find a Trello card with the query \`\`${query}\`\`. Please ensure the business name is correct.`,
				});
			}

			span.setAttribute("trello.short_url", ExistingCard.shortUrl);
			Sentry.logger.info("Adding comment to Trello card", { cardId: ExistingCard.id, shortUrl: ExistingCard.shortUrl });

			await Sentry.startSpan({
				name: "Trello: Add Activity Comment",
				op: "axios.trello.comment",
				attributes: { "trello.card_id": ExistingCard.id }
			}, async (childSpan) => {
				try {
					const currentTime = new Date();
					await CommentOnTrelloCardID(ExistingCard.id,
						`##Land Activity

**Submitted at**: ${currentTime.toUTCString()}
**Submitter**: ${robloxName}

**Property District**: ${District}
**Property Activity**: ${propertyActivity}

**Additional Information**: ${additionalInformation}`, childSpan
					);
					childSpan.setStatus({ code: 1 });
					Sentry.logger.info("Successfully added comment to Trello card", { cardId: ExistingCard.id });
				}
				catch (err) {
					Sentry.logger.info("Failed to add comment to Trello card", { message: (err as Error).message, cardId: ExistingCard.id });
					span.setStatus({ code: 2, message: "trello_comment_error" });
					span.setAttribute("error.message", (err as Error).message);

					childSpan.setStatus({ code: 2 });
					Sentry.captureException(err);
				}
			});

			// Prepare embed and notification
			Sentry.logger.info("Preparing embed and notification message");
			const newEmbed = new EmbedBuilder()
				.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
				.setTitle("New Property Activity Submission")
				.addFields(
					{ name: "Business", value: businessName, inline: true },
					{ name: "Roblox Name", value: robloxName, inline: true },
					{ name: "District", value: District, inline: true },
					{ name: "Trello Card", value: `[Link](${ExistingCard.shortUrl})` }
				)
				.setTimestamp()
				.setColor(global.embeds.embedColors.activity)
				.setFooter(global.embeds.embedFooter);

			const incomingRequestButton = new ButtonBuilder()
				.setLabel("Property Card")
				.setURL(ExistingCard.shortUrl)
				.setStyle(ButtonStyle.Link);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(incomingRequestButton);

			Sentry.logger.info("Fetching notification channel", { channelId: global.ChannelIDs.landSubmissions });

			const channel: Channel = await interaction.client.channels.fetch(global.ChannelIDs.landSubmissions);
			if (channel && channel instanceof TextChannel) {
				const mentions: string = DistrictManagers.map(m => `<@${m.DiscordId}>`).join(" ");
				Sentry.logger.info("Sending notification to channel", { channelId: channel.id, mentionsCount: DistrictManagers.length });

				await channel.send({ content: mentions, embeds: [newEmbed], components: [row] });
				Sentry.logger.info("Notification sent to channel", { channelId: channel.id });
			} else {
				Sentry.logger.info("Notification channel not found", { channelId: global.ChannelIDs.landSubmissions });
			}

			span.setStatus({ code: 1 });
			Sentry.logger.info("Property activity modal processing complete", { user: interaction.user.tag, cardUrl: ExistingCard.shortUrl });
			return interaction.editReply({
				content: `Success! Activity added to [Trello Card](${ExistingCard.shortUrl}).`
			});
		});
	}
}
