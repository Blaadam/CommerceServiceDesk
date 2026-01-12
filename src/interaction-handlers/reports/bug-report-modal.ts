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
    name: "bug-report-modal",
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
        const bugTitle: string = interaction.fields.getTextInputValue("bugTitle");
        const bugDesc: string = interaction.fields.getTextInputValue("bugDesc");

        Sentry.logger.info(
            `Received bug report submission from ${interaction.user.tag} (${interaction.user.id})`
        );

        if (!bugTitle || !bugDesc) {
            return interaction.reply({
                content: "You did not fill in the fields correctly.",
                flags: ["Ephemeral"],
            });
        }

        Sentry.captureFeedback({
            name: `${bugTitle} - Bug Report`,
            message: `${bugDesc}\n\n${interaction.user.tag} (${interaction.user.id})`,
        });

        return interaction.reply({
            content: `Your submission was received successfully and has been forwarded to support.`,
            flags: ["Ephemeral"],
        });
    }
}
