import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextChannel,
    type ModalSubmitInteraction,
} from "discord.js";
import Sentry from "@sentry/node";

import { ApplyOptions } from "@sapphire/decorators";

const FEEDBACK_HEADER = "Nøyra - Customer Feedback";
const FEEDBACK_DESCRIPTION = `
**Work Product**
__WORKPRODUCT__

**Professionalism Rating**
__PROFFESSIONALISMRATING__

**Recommend Rating**
__RECOMMENDRATING__

**Work Again Rating**
__WORKAGAINRATING__

**Additional Comments**
__ADDITIONALFEEDBACK__

-# Commerce Service Desk is a service developed and managed by Nøyra.
-# Join our Discord for any inquiries: https://discord.gg/5SdTjEKCdM
`

@ApplyOptions({
    name: "customer-rating-modal",
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
        if (interaction.customId !== this.name) return this.none();

        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        const workProduct: string = interaction.fields.getTextInputValue("workProduct");
        const professionalRating: string = interaction.fields.getStringSelectValues("professionalRating")[0];
        const recommendRating: string = interaction.fields.getStringSelectValues("recommendRating")[0];
        const workAgainRating: string = interaction.fields.getStringSelectValues("workAgainRating")[0];
        const additionalFeedback: string = interaction.fields.getTextInputValue("additionalFeedback");

        Sentry.logger.info(
            `Received customer rating submission from ${interaction.user.tag} (${interaction.user.id})`
        );

        if (!professionalRating || !recommendRating || !workAgainRating) {
            return interaction.reply({
                content: "You did not fill in the required fields correctly.",
                flags: ["Ephemeral"],
            });
        }

        const feedbackContainer = new ContainerBuilder()
            .setAccentColor(global.embeds.accentColors.noyra)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `# ${FEEDBACK_HEADER.trim()}`
                ),
            )
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    FEEDBACK_DESCRIPTION
                        .trim()
                        .replace("__WORKPRODUCT__", workProduct || "N/A")
                        .replace("__PROFFESSIONALISMRATING__", professionalRating)
                        .replace("__RECOMMENDRATING__", recommendRating)
                        .replace("__WORKAGAINRATING__", workAgainRating)
                        .replace("__ADDITIONALFEEDBACK__", additionalFeedback || "None")
                )
            )
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `*Testimonial submitted by ${interaction.user.toString()}*`
                )
            );

        const feedbackActionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel("Accept Feedback")
                    .setStyle(ButtonStyle.Success)
                    .setCustomId(`accept-customer-feedback`),
            );

        const feedbackChannel = await this.container.client.channels.fetch(global.ChannelIDs.noyraCustomerFeedback);
        if (!feedbackChannel || !(feedbackChannel instanceof TextChannel)) {
            return interaction.reply({
                content: "Failed to find the feedback channel.",
                flags: ["Ephemeral"],
            });
        }

        await feedbackChannel.send({ components: [feedbackContainer, feedbackActionRow], flags: ["IsComponentsV2"] });

        await interaction.reply({
            content: "Thank you for your feedback! It has been submitted successfully.",
            flags: ["Ephemeral"],
        });
    }
}
