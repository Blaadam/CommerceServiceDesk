import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { DMChannel, Embed, EmbedBuilder, User, type ButtonInteraction } from 'discord.js';

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
    const submitter: User = interaction.message.mentions.users.first();
    const embed: Embed = interaction.message.embeds[0];

    const landPermit: string = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

    const dmChannel: DMChannel = await submitter.createDM();

    if (!dmChannel) {
      return interaction.reply({ content: "Could not create DM channel with the submitter.", ephemeral: true });
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

    return interaction.reply({
      content: `You have approved the property submission for ${landPermit}.`,
      flags: ["Ephemeral"],
    });

  }
}