import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	LabelBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

@ApplyOptions<Command.Options>({
	name: "issue-land-permit",
	description:
		"Sends a message that an individual passed their Land Permit Application",
	cooldownDelay: 5_000,
})
export default class NewPermitCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(
					PermissionFlagsBits.ManageMessages,
				);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		const newModal = new ModalBuilder()
			.setCustomId("issue-lease-modal")
			.setTitle("Issue Land Permit")
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					"This form will be used to issue a land permit. Please select the users whose land permit are being issued.",
				),
			)
			.addLabelComponents(
				new LabelBuilder()
					.setLabel("Receiving Users")
					.setUserSelectMenuComponent(
						new UserSelectMenuBuilder()
							.setCustomId("userSelect")
							.setPlaceholder(
								"Select the users to be notified of the issuance.",
							)
							.setMinValues(1)
							.setMaxValues(3)
							.setRequired(true),
					),
				new LabelBuilder()
					.setLabel("Business Name")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId("businessName")
							.setStyle(TextInputStyle.Short)
							.setPlaceholder("Enter the name of the business.")
							.setRequired(true),
					),
				new LabelBuilder()
					.setLabel("Lease Link")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId("leaseLink")
							.setStyle(TextInputStyle.Short)
							.setPlaceholder(
								"Enter the link to the lease from the Land Management Database Trello board.",
							)
							.setRequired(true),
					),
			);

		await interaction.showModal(newModal);
	}
}
