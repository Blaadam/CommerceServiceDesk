import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    LabelBuilder,
    ModalBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions<Command.Options>({
    name: "new-feature-request",
    description: "Create a new feature request submission",
    cooldownDelay: 2_500,
})
export default class ViewHistoryCommand extends Command {
    public override registerApplicationCommands(
        registry: ApplicationCommandRegistry
    ) {
        registry.registerChatInputCommand((command) => {
            command
                .setName(this.name)
                .setDescription(this.description);
        });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        const modal = new ModalBuilder()
            .setCustomId("feature-request-modal")
            .setTitle("Feature Request Submission");

        const textDisplayLabel = new TextDisplayBuilder()
            .setContent("This modal is used to receive feedback for new features. Please provide as much detail as possible to help us understand your request.");

        const titleLabel = new LabelBuilder()
            .setLabel("Feature Title")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("featureTitle")
                    .setPlaceholder("Enter the title of the feature")
                    .setStyle(TextInputStyle.Short)
            );

        const descLabel = new LabelBuilder()
            .setLabel("Feature Description")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("featureDesc")
                    .setPlaceholder("Enter a description of the feature, including use cases and how it would work")
                    .setStyle(TextInputStyle.Paragraph)
            );

        modal.addTextDisplayComponents(textDisplayLabel);
        modal.addLabelComponents(titleLabel, descLabel);

        return await interaction.showModal(modal);
    }
}
