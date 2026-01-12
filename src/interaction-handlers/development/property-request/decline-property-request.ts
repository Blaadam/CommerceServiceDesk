import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle, User, type ButtonInteraction } from 'discord.js';
import { getUserIdFromString } from '../../../shared/useridFromString';

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
    const messageId = interaction.message.id;
    const submitterId = getUserIdFromString(interaction.message.content);
    if (!submitterId) {
      return interaction.reply({ content: "Could not extract submitter ID from message content.", ephemeral: true });
      throw new Error("Could not extract submitter ID from message content.");
    }

    const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);

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
  }
}