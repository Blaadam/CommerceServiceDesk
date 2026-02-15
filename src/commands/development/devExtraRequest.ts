import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    FileUploadBuilder,
    LabelBuilder,
    ModalBuilder,
    PermissionFlagsBits,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

const DISCLAIMER = `
This form may be used as a request, or a submission for extra files related to a business such as tools, assets or vehicles.

If you are requesting a property, please use the **/dev-request-property** command. If you are submitting a property, please use the **/dev-submit-property** command.

Ensure the extra files are in .rbxm format. Your submission will be declined if it includes the wrong format.
`;

@ApplyOptions<Command.Options>({
    name: "extra-dev-request",
    description: "Submit an extra request for review. Files can be attached.",
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
            .setCustomId("extra-dev-request-modal")
            .setTitle("Extra Dev Request");

        const businessLicenseLabel = new LabelBuilder()
            .setLabel("Business License")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("businessLicense")
                    .setPlaceholder("[LINK TO BUSINESS LICENSE]")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            );

        const fileFormatTextDisplayLabel = new TextDisplayBuilder()
            .setContent(DISCLAIMER.trim());

        const extraFileLabel = new LabelBuilder()
            .setLabel("Extra Files (Optional)")
            .setFileUploadComponent(
                new FileUploadBuilder()
                    .setCustomId("extraFiles")
                    .setRequired(false)
                    .setMinValues(0)
                    .setMaxValues(5)
            );

        const furtherInformationLabel = new LabelBuilder()
            .setLabel("Further Information")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("furtherInformation")
                    .setPlaceholder("Default: N/A")
                    .setStyle(TextInputStyle.Paragraph)
            );

        modal.addTextDisplayComponents(fileFormatTextDisplayLabel);
        modal.addLabelComponents(businessLicenseLabel ,extraFileLabel, furtherInformationLabel);

        return await interaction.showModal(modal);
    }
}
