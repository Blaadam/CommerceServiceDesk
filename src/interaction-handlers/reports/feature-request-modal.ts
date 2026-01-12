import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
import * as Sentry from "@sentry/node";
require("dotenv").config();

import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions({
    name: "feature-request-modal",
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
        const featureTitle: string = interaction.fields.getTextInputValue("featureTitle");
        const featureDesc: string = interaction.fields.getTextInputValue("featureDesc");

        if (!featureTitle || !featureDesc) {
            return interaction.reply({
                content: "You did not fill in the fields correctly.",
                flags: ["Ephemeral"],
            });
        }

        Sentry.captureFeedback({
            name: `${featureTitle} - Feature Request`,
            message: `${featureDesc}\n\n${interaction.user.tag} (${interaction.user.id})`,
        });

        return interaction.reply({
            content: `Your feedback was received successfully and has been forwarded to support.`,
            flags: ["Ephemeral"],
        });
    }
}
