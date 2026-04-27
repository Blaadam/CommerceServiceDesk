import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	TextChannel,
	type ModalSubmitInteraction,
} from "discord.js";
import axios from "axios";
import Sentry from "@sentry/node";

import { databaseConnection } from "../../../database";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../../shared/sentry-utils";
const connection = new databaseConnection();

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const ADDON = `?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

const AWAITING_APPROVAL_LIST_ID = "642e6160c9c885fea1ce3569"
const ARCHIVE_LIST_ID = "695aff93c8b437dbdc7fc51f"

async function MoveCard(CardID: string, ListID: string, UserId: string, Notes: string) {
	const url = `https://api.trello.com/1/cards/${CardID}${ADDON}&idList=${ListID}&keepFromSource=all&pos=bottom`

	// Add comment to card
	await axios.post(
		`https://api.trello.com/1/cards/${CardID}/actions/comments${ADDON}`,
		{ text: `Last action performed by <@${UserId}>.\n\n**Notes:**\n${Notes}` },
		{ headers: { "Content-Type": "application/json" } }
	)

	// Move card to new list
	await axios.put(url, {}, { headers: { "Content-Type": "application/json" } })
}

// Grabs the manager for a district
async function GetManagersFromDistrict(district: string) {
	const table = connection.prisma.managerTable
	const rows = await table.findMany({ where: { District: district } });
	return rows;
}

@ApplyOptions({
	name: "property-req-action",
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
		if (interaction.customId.startsWith(`${this.name}_`)) return this.some();

		return this.none();
	}

	public async run(interaction: ModalSubmitInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		const split: string[] = interaction.customId.split("_")
		const action: string = split[1]
		const CardID: string = split[2]
		const MessageID: string = split[3]

		const notes = interaction.fields.getTextInputValue(action == "approve" ? "approvalNotes" : "declineNotes") || "N/A";

		return SentryHelper.tracer(interaction, {
			name: "Property Request Action Modal Submission",
			op: "property.request_modal_action_submission",
			attributes: {
				"modal.custom_id": interaction.customId,
			},
		}, async (span) => {
			span.setAttribute("user.id", interaction.user.id);
			span.setAttribute("user.tag", interaction.user.tag);

			span.setAttribute("action.type", action);

			span.setAttribute("interaction.id", interaction.id);
			span.setAttribute("interaction.customId", interaction.customId);

			if (!CardID || !MessageID) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "invalid_custom_id_format");
				span.setStatus({ code: 2, message: "invalid_custom_id_format" });

				return interaction.editReply({
					content: "There was an error while processing your request.\nPlease use the bug report command to report this issue.",
				});
			}

			const channel = interaction.channel as TextChannel;
			const message = await channel.messages.fetch(MessageID).catch(err => {
				Sentry.captureException(err);
				return null;
			});

			if (!message) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "original_message_not_found");
				span.setStatus({ code: 2, message: "original_message_not_found" });

				return interaction.editReply({
					content: "There was an error while processing your request.\nPlease use the bug report command to report this issue.",
				});
			}

			const existingEmbed = message.embeds[0];
			if (!existingEmbed) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "original_embed_not_found");
				span.setStatus({ code: 2, message: "original_embed_not_found" });

				return interaction.editReply({
					content: "There was an error while processing your request.\nPlease use the bug report command to report this issue.",
				});
			}

			const districtField = existingEmbed.fields.find(field => field.name === "Property District");
			if (!districtField) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "property_district_field_not_found");
				span.setStatus({ code: 2, message: "property_district_field_not_found" });

				return interaction.editReply({
					content: "There was an error while processing your request.\nPlease use the bug report command to report this issue.",
				});
			}

			const district = districtField.value;
			const managers = await Sentry.startSpan({
				name: "GetManagersFromDistrict",
				op: "get_managers_from_district"
			}, async (childSpan) => {
				childSpan.setAttribute("district", district);
				try {
					const response = await GetManagersFromDistrict(district);
					childSpan.setAttribute("managers_count", Array.isArray(response) ? response.length : 0);
					return response;
				}
				catch (error) {
					childSpan.setStatus({ code: 2, message: "Failed to fetch managers for district" });
					Sentry.captureException(error);
					return [];
				}
			});

			if (managers.length === 0) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "no_managers_for_district");
				span.setStatus({ code: 2, message: "no_managers_for_district" });
			}

			if (!managers.some(manager => String(manager.DiscordId) === interaction.user.id)) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "user_not_manager_for_district");
				span.setStatus({ code: 2, message: "user_not_manager_for_district" });

				return interaction.editReply({
					content: "You are not a manager for the property district associated with this request.",
				});
			}

			const newEmbed = EmbedBuilder.from(existingEmbed);
			newEmbed.setColor(action == "approve" ? global.embeds.embedColors.success : global.embeds.embedColors.error);
			newEmbed.addFields({ name: "Status", value: `${action == "approve" ? "Approved" : "Denied"} by <@${interaction.user.id}>` });

			const newActionRow = ActionRowBuilder.from(message.components[0] as any);
			newActionRow.components.forEach(component => {
				(component as ButtonBuilder).setDisabled(true);
			});

			await message.edit({ embeds: [newEmbed], components: [newActionRow as any] });

			const thisManager = managers.find(manager => String(manager.DiscordId) === interaction.user.id);

			if (!thisManager) {
				span.setAttribute("command.status", "failed");
				span.setAttribute("command.status_reason", "manager_record_not_found");
				span.setStatus({ code: 2, message: "manager_record_not_found" });

				return interaction.editReply({
					content: "There was an error while processing your request.\nPlease use the bug report command to report this issue.",
				});
			}

			Sentry.startSpan({
				name: "MoveCard",
				op: "move_card"
			}, async (childSpan) => {
				childSpan.setAttribute("card_id", CardID);
				childSpan.setAttribute("list_id", action == "approve" ? ARCHIVE_LIST_ID : AWAITING_APPROVAL_LIST_ID);
				childSpan.setAttribute("user_id", interaction.user.id);
				childSpan.setAttribute("notes_length", notes.length);

				await MoveCard(CardID, action == "approve" ? AWAITING_APPROVAL_LIST_ID : ARCHIVE_LIST_ID, thisManager.TrelloId, `${notes}\n\nRequest ${action == "approve" ? "approved" : "declined"} via Discord modal submission.`);
			});

			span.setAttribute("command.status", "success");

			return interaction.editReply({
				content: `The request has been ${action == "approve" ? "approved" : "declined"}.`,
			});
		});
	}
}
