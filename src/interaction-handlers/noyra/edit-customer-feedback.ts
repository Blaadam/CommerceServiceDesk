import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { LabelBuilder, ModalBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';

@ApplyOptions({
    name: "edit-customer-feedback",
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
        const editModal = new ModalBuilder()
            .setCustomId(`edit-customer-rating-modal_${interaction.message.id}`)
            .setTitle("Edit Customer Feedback")
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent("On submission, feedback will be updated with the corrected fields. This will be irreversible.")
            )
            .addLabelComponents(
                new LabelBuilder()
                    .setLabel("Work Product")
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("workProduct")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
            );

        await interaction.showModal(editModal);
    }
}