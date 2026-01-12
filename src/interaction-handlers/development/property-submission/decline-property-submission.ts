import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { Embed, LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle, User, type ButtonInteraction } from 'discord.js';

@ApplyOptions({
  name: "decline-property-submission",
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
    const messageId: string = interaction.message.id;
    const submitter: User = interaction.message.mentions.users.first();

    const declineModal = new ModalBuilder()
      .setCustomId(`decline-dev-modal-${messageId}`)
      .setTitle("Decline Property Submission");

    const declineTextDisplay = new TextDisplayBuilder()
      .setContent(`You are declining the property submission by **${submitter.tag}**.\nPlease provide a reason for declining this submission below.`);

    const declineReasonLabel = new LabelBuilder()
      .setLabel("Reason for Declining")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("declineReason")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Provide a reason for declining this property submission.")
          .setRequired(true)
      );

    declineModal.addTextDisplayComponents(declineTextDisplay);
    declineModal.addLabelComponents(declineReasonLabel);

    return await interaction.showModal(declineModal);
  }
}