import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { LabelBuilder, ModalBuilder, TextChannel, TextDisplayBuilder, TextInputBuilder, TextInputStyle, TopLevelComponent, type ButtonInteraction } from 'discord.js';

@ApplyOptions({
    name: "accept-customer-feedback",
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
        const customerRatingContainer = interaction.message.components[0] as TopLevelComponent;
        if (!customerRatingContainer) {
            return interaction.reply({
                content: "Failed to find the original feedback message components.",
                flags: ["Ephemeral"],
            });
        }

        const testimonialChannel = await this.container.client.channels.fetch(global.ChannelIDs.noyraCustomerTestimonials);
        if (!testimonialChannel || !(testimonialChannel instanceof TextChannel)) {
            return interaction.reply({
                content: "Failed to find the testimonial channel.",
                flags: ["Ephemeral"],
            });
        }

        await testimonialChannel.send({ components: [customerRatingContainer], flags: ["IsComponentsV2"] });

        await interaction.reply({
            content: "The feedback has been accepted and it has been posted in the testimonial channel.",
            flags: ["Ephemeral"],
        });
    }
}