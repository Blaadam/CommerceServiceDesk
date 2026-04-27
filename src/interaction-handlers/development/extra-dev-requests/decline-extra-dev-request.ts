import { ApplyOptions } from "@sapphire/decorators";
import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	LabelBuilder,
	ModalBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	User,
	type ButtonInteraction,
} from "discord.js";
import { getUserIdFromString } from "../../../shared/useridFromString";

@ApplyOptions({
	name: "decline-extra-dev-request",
})
export class ButtonHandler extends InteractionHandler {
	public constructor(
		ctx: InteractionHandler.LoaderContext,
		options: InteractionHandler.Options,
	) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== this.name) return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const messageId: string = interaction.message.id;

		const submitterId: string | null = getUserIdFromString(
			interaction.message.content,
		);

		if (!submitterId) {
			return interaction.reply({
				content: "Could not extract submitter ID from message content.",
				flags: ["Ephemeral"],
			});
		}

		const submitter: User | undefined =
			interaction.client.users.cache.get(submitterId) ||
			(await interaction.client.users.fetch(submitterId));

		if (!submitter) {
			return interaction.reply({
				content:
					"Could not find the submitter from the message mentions.",
				flags: ["Ephemeral"],
			});
		}

		const declineModal = new ModalBuilder()
			.setCustomId(`decline-extra-dev-modal-${messageId}`)
			.setTitle("Decline Extra Dev Request");

		const declineTextDisplay = new TextDisplayBuilder().setContent(
			`You are declining the extra dev request by **${submitter.tag}**.\nPlease provide a reason for declining this submission below.`,
		);

		const declineReasonLabel = new LabelBuilder()
			.setLabel("Reason for Declining")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("declineReason")
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder(
						"Provide a reason for declining this extra dev request.",
					)
					.setRequired(true),
			);

		declineModal.addTextDisplayComponents(declineTextDisplay);
		declineModal.addLabelComponents(declineReasonLabel);

		return await interaction.showModal(declineModal);
	}
}
