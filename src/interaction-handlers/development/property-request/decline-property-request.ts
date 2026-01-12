import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle, User, type ButtonInteraction } from 'discord.js';
import { getUserIdFromString } from '../../../shared/useridFromString';
import { SentryHelper } from '../../../shared/sentry-utils.ts';

@ApplyOptions({
	name: "decline-property-request",
})
export class ButtonHandler extends InteractionHandler {
	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== this.name) return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		SentryHelper.tracer(interaction, {
			name: "Decline Property Request Button",
			op: "interaction.handler.property-request.decline-button",
		}, async (span) => {
			const messageId: bigint = BigInt(interaction.message.id);
			span.setAttribute("interaction.messageId", messageId.toString());

			const submitterId: string = getUserIdFromString(interaction.message.content);

			if (!submitterId) {
				span.setAttribute("interaction.status", "failed");
				span.setAttribute("interaction.response", "Could not extract submitter ID from message content.");
				span.setStatus({ code: 2 });

				return await interaction.reply({ content: "Could not extract submitter ID from message content.", ephemeral: true });
			}

			const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);
			span.setAttribute("interaction.submitterId", submitter.id);

			const declineModal = new ModalBuilder()
				.setCustomId(`decline-request-modal-${messageId}`)
				.setTitle("Decline Property Request");

			const declineTextDisplay = new TextDisplayBuilder()
				.setContent(`You are declining the property request by **${submitter.username}**.\nPlease provide a reason for declining this request below.`);

			const declineReasonLabel = new LabelBuilder()
				.setLabel("Reason for Declining")
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId("declineReason")
						.setStyle(TextInputStyle.Paragraph)
						.setPlaceholder("Provide a reason for declining this property request.")
						.setRequired(true)
				);

			declineModal.addTextDisplayComponents(declineTextDisplay);
			declineModal.addLabelComponents(declineReasonLabel);

			return await interaction.showModal(declineModal);
		});
	}
}