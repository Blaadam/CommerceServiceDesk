import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
  Embed,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextDisplayBuilder,
  User,
  type ButtonInteraction
} from 'discord.js';
import { getUserIdFromString } from '../../../shared/useridFromString';

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
    const messageId: bigint = BigInt(interaction.message.id);
    const submitterId: string = getUserIdFromString(interaction.message.content);
    if (!submitterId) {
      throw new Error("Could not extract submitter ID from message content.");
    }

    const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);

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
  }
}