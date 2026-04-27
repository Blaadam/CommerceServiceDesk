import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	Channel,
	ContainerBuilder,
	DMChannel,
	EmbedBuilder,
	GuildMember,
	LabelBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	Role,
	TextChannel,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import Sentry from "@sentry/node";

@ApplyOptions<Command.Options>({
	name: "revoke-land-permit",
	description:
		"Sends a message that an individual had their land permit revoked",
	cooldownDelay: 5_000,
})
export default class ViewHistoryCommand extends Command {
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
			.setCustomId("revoke-lease-modal")
			.setTitle("Revoke Land Permit")
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					"This form will be used to revoke a land permit. Please select the users whose land permit are being revoked.",
				),
			)
			.addLabelComponents(
				new LabelBuilder()
					.setLabel("Receiving Users")
					.setUserSelectMenuComponent(
						new UserSelectMenuBuilder()
							.setCustomId("userSelect")
							.setPlaceholder(
								"Select the users to be notified of the revocation.",
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
							.setRequired(true)
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
				new LabelBuilder()
					.setLabel("Reason for Revocation")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId("revokeReason")
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder(
								"Place each new reason on a new line.",
							)
							.setRequired(true),
					),
			);

		await interaction.showModal(newModal);
	}
}
