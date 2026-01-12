import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    FileUploadBuilder,
    LabelBuilder,
    ModalBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions<Command.Options>({
    name: "submit-property",
    description: "Submit a property file for review.",
    cooldownDelay: 5_000,
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
            .setCustomId("property-submission-modal")
            .setTitle("Property Submission");

        const landPermitLabel = new LabelBuilder()
            .setLabel("BLM Land Permit")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("landPermit")
                    .setPlaceholder("[LINK TO LAND MANAGEMENT DATABASE PROPERTY LISTING]")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            );

        const textDisplayLabel = new TextDisplayBuilder()
            .setContent("Ensure the property file is in .rbxm format. Your submission will be declined if it includes the wrong format.");

        const propertyFileLabel = new LabelBuilder()
            .setLabel("Property File")
            .setFileUploadComponent(
                new FileUploadBuilder()
                    .setCustomId("propertyFile")
                    .setRequired(true)
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        const bannerImageLabel = new LabelBuilder()
            .setLabel("Exterior Banner Image")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("bannerImage")
                    .setPlaceholder("rbxassetid://1234567890")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            );

        const furtherInformationLabel = new LabelBuilder()
            .setLabel("Further Information")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("furtherInformation")
                    .setPlaceholder("Default: N/A")
                    .setStyle(TextInputStyle.Paragraph)
            );

        modal.addLabelComponents(landPermitLabel);
        modal.addTextDisplayComponents(textDisplayLabel);
        modal.addLabelComponents(propertyFileLabel, bannerImageLabel, furtherInformationLabel);
        return await interaction.showModal(modal);
    }
}
