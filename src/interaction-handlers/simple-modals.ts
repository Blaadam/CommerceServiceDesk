import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, Guild, GuildMember, Role } from 'discord.js';
import Sentry from "@sentry/node";
import { SentryHelper } from '../shared/sentry-utils';
import * as cross_modals from "../shared/cross-modals"

@ApplyOptions({
    name: "modal-",
})
export class ButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(this.name)) return this.none();

        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        return SentryHelper.tracer(interaction, {
            name: "Modal Simple Button",
            op: "button.modal",
        }, async (span: any) => {
            const modalName: string = interaction.customId.replace(this.name, "")
            if (cross_modals[modalName]) {
                span.setAttribute("modal.name", modalName);
                await cross_modals[modalName](interaction);
            } else {
                await interaction.reply({ content: `No modal found for ${modalName}`, flags: ["Ephemeral"] });
                span.setAttribute("modal.name", "not_found");
            }
        });
    }
}