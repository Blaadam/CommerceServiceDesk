import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	LabelBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions<Command.Options>({
	name: "new-request",
	description: "Create a new property request",
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
			.setCustomId("request-modal")
			.setTitle("New Property");

		const permitLabel = new LabelBuilder()
			.setLabel("Business Permit")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("businessPermit")
					.setPlaceholder("https://trello.com/b/r4a8Tw1I/commerce-permit-database")
					.setStyle(TextInputStyle.Short)
			);

		const businessGroupLabel = new LabelBuilder()
			.setLabel("Business Group")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("businessGroup")
					.setPlaceholder("Firestone Department of Commerce")
					.setStyle(TextInputStyle.Short)
			);

		const propertiesBeforeLabel = new LabelBuilder()
			.setLabel("Will this be your first or second property?")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("propertiesBefore")
					.setPlaceholder("[FIRST / SECOND]")
					.setStyle(TextInputStyle.Paragraph)
			);

		const requestedLandLabel = new LabelBuilder()
			.setLabel("What property would you like to request")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("requestedLand")
					.setPlaceholder("[LINK]")
					.setStyle(TextInputStyle.Short)
			);

		const propertyUseLabel = new LabelBuilder()
			.setLabel("How will your property be used?")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("propertyUse")
					.setStyle(TextInputStyle.Paragraph)
			);

		modal.addLabelComponents(
			permitLabel,
			businessGroupLabel,
			propertiesBeforeLabel,
			requestedLandLabel,
			propertyUseLabel
		);

		return await interaction.showModal(modal);
	}
}
