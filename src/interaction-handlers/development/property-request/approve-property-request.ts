import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
	FileUploadBuilder,
	LabelBuilder,
	ModalBuilder,
	TextDisplayBuilder,
	User,
	type ButtonInteraction
} from 'discord.js';
import { getUserIdFromString } from '../../../shared/useridFromString';
import { SentryHelper } from '../../../shared/sentry-utils.ts';

@ApplyOptions({
	name: "approve-property-request",
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
			name: "Approve Property Request Button",
			op: "interaction.handler.property-request.approve-button",
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

			const approveModal = new ModalBuilder()
				.setCustomId(`approve-request-modal-${messageId}`)
				.setTitle("Approve Property Request");

			const approveTextDisplay = new TextDisplayBuilder()
				.setContent(`You are approving the property request by **${submitter.username}**.\nPlease attach the property file below.`);

			const propertyFileUploadLabel = new LabelBuilder()
				.setLabel("Property File Upload")
				.setFileUploadComponent(
					new FileUploadBuilder()
						.setCustomId("propertyFile")
						.setRequired(true)
				);

			approveModal.addTextDisplayComponents(approveTextDisplay);
			approveModal.addLabelComponents(propertyFileUploadLabel);

			await interaction.showModal(approveModal);
		});
	}
}