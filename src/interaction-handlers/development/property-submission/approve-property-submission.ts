import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { DMChannel, Embed, EmbedBuilder, User, type ButtonInteraction } from 'discord.js';
import Sentry from '@sentry/node';
import { getUserIdFromString } from '../../../shared/useridFromString';

@ApplyOptions({
  name: "approve-property-submission",
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
    const embed: Embed = interaction.message.embeds[0];
    const submitterId: string = getUserIdFromString(interaction.message.content);

    if (!submitterId) {
      return await interaction.reply({ content: "Could not extract submitter ID from message content.", flags: ["Ephemeral"] });
    }

    const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);

    const dmChannel: DMChannel = await submitter.createDM();

    if (!dmChannel) {
      return interaction.reply({ content: "Could not create DM channel with the submitter.", flags: ["Ephemeral"] });
    }

    await dmChannel.send({
      content: `Your property submission has been approved by ${interaction.user.toString()}.`,
      embeds: [embed],
    });

    const newEmbed = new EmbedBuilder(embed)
      .setColor(global.embeds.embedColors.success)
      .setFooter({ text: `Approved by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.message.edit({
      content: `This property submission has been approved by ${interaction.user.toString()}.`,
      components: [],
      embeds: [newEmbed],
    });

    Sentry.metrics.count("property.development.submission.approved", 1, {
      attributes: {


        "developer.id": interaction.user.id,
        "developer.tag": interaction.user.tag,

        "submitter.id": submitter.id,
        "submitter.tag": submitter.tag,
      }
    });

    const landPermit: string = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

    return interaction.reply({
      content: `You have approved the property submission for ${landPermit}.`,
      flags: ["Ephemeral"],
    });
  }
}