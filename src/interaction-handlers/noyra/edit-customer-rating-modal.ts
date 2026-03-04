import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    ActionRowBuilder,
    AnyComponentV2,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ContainerBuilder,
    ContainerComponent,
    TextChannel,
    TextDisplayComponent,
    TopLevelComponent,
    TopLevelComponentData,
    type ModalSubmitInteraction,
} from "discord.js";
import Sentry from "@sentry/node";

import { ApplyOptions } from "@sapphire/decorators";
import { getUserIdFromString } from "../../shared/useridFromString";

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
    name: "edit-customer-rating-modal_",
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
        if (!interaction.customId.startsWith(this.name)) {
            return this.none()
        }

        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        const lastMessageId: string = interaction.customId.split("_")[1];
        const workProduct_edited: string = interaction.fields.getTextInputValue("workProduct");

        const feedbackChannel = await this.container.client.channels.fetch(global.ChannelIDs.noyraCustomerFeedback);
        if (!feedbackChannel || !(feedbackChannel instanceof TextChannel)) {
            return interaction.reply({
                content: "Failed to find the feedback channel.",
                flags: ["Ephemeral"],
            });
        }

        const message = await feedbackChannel.messages.fetch(lastMessageId);
        if (!message) {
            return interaction.reply({
                content: "Failed to find the original feedback message.",
                flags: ["Ephemeral"],
            });
        }

        const topLevelComponent = message.components[0] as ContainerComponent;
        if (!topLevelComponent) {
            return interaction.reply({
                content: "Failed to find the original feedback message components.",
                flags: ["Ephemeral"],
            });
        }

        const feedbackLabel = topLevelComponent.components[1] as TextDisplayComponent;
        if (!feedbackLabel) {
            return interaction.reply({
                content: "Failed to find the original feedback label component.",
                flags: ["Ephemeral"],
            });
        }

        const feedbackContent = feedbackLabel.data.content as string;
        const feedbackMatch = feedbackContent.match(/\*\*(.*?)\*\*\n+([\s\S]*?)(?=\n\n\*\*|\n-#|$)/gm);

        const professionalismRating = feedbackMatch?.find((section) => section.startsWith("**Professionalism Rating**"))?.split("\n")[1] || "N/A";
        const recommendRating = feedbackMatch?.find((section) => section.startsWith("**Recommend Rating**"))?.split("\n")[1] || "N/A";
        const workAgainRating = feedbackMatch?.find((section) => section.startsWith("**Work Again Rating**"))?.split("\n")[1] || "N/A";
        const additionalFeedback = feedbackMatch?.find((section) => section.startsWith("**Additional Comments**"))?.split("\n")[1] || "None";

        const testimonialLabel = topLevelComponent.components[2] as TextDisplayComponent;

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
                        .replace("__WORKPRODUCT__", workProduct_edited || "N/A")
                        .replace("__PROFFESSIONALISMRATING__", professionalismRating)
                        .replace("__RECOMMENDRATING__", recommendRating)
                        .replace("__WORKAGAINRATING__", workAgainRating)
                        .replace("__ADDITIONALFEEDBACK__", additionalFeedback || "None")
                )
            )
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    testimonialLabel.data.content
                )
            );

        await message.edit({ components: [feedbackContainer, message.components[1]], flags: ["IsComponentsV2"] });

        await interaction.reply({
            content: "Feedback has been updated successfully.",
            flags: ["Ephemeral"],
        });
    }
}
