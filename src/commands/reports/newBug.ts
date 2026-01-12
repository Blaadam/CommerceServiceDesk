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
    name: "new-bug-report",
    description: "Create a new bug report submission",
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
            .setCustomId("bug-report-modal")
            .setTitle("Bug Report Submission");

        const textDisplayLabel = new TextDisplayBuilder()
            .setContent("This modal is used to receive feedback for bug fixes. Please provide as much detail as possible to help us understand your report.");

        const titleLabel = new LabelBuilder()
            .setLabel("Bug Title")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("bugTitle")
                    .setPlaceholder("Enter the title of the bug")
                    .setStyle(TextInputStyle.Short)
            );

        const descLabel = new LabelBuilder()
            .setLabel("Bug Description")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("bugDesc")
                    .setPlaceholder("Enter a description of the bug, including steps to reproduce it")
                    .setStyle(TextInputStyle.Paragraph)
            );

        modal.addTextDisplayComponents(textDisplayLabel);
        modal.addLabelComponents(titleLabel, descLabel);
        return await interaction.showModal(modal);
    }
}
