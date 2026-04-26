import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	ButtonBuilder,
	ButtonStyle,
	Channel,
	ContainerBuilder,
	MessageFlagsBitField,
	PermissionFlagsBits,
	TextChannel,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

const TITLE = "Nøyra Support Services";
const MESSAGE = `
Nøyra Oy is proud to offer a range of support services to assist the Department of Commerce in managing its operations effectively. Our dedicated team is here to provide assistance with various aspects of property management, development support, and general inquiries.

-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM
-# Please make a ticket in our official discord server for any enquires.
`;

const LINK_BUTTONS: ButtonBuilder[] = [
	new ButtonBuilder()
		.setLabel("Support Server")
		.setStyle(ButtonStyle.Link)
		.setURL("https://discord.com/invite/5SdTjEKCdM"),
];

const ACTION_BUTTONS: ButtonBuilder[] = [
	new ButtonBuilder()
		.setLabel("New Property Aquisition")
		.setStyle(ButtonStyle.Secondary)
		.setCustomId("blm_property_request_modal"),
	new ButtonBuilder()
		.setLabel("New Property Activity")
		.setStyle(ButtonStyle.Secondary)
		.setCustomId("blm_property_activity_modal"),
	new ButtonBuilder()
		.setLabel("Request Property File")
		.setStyle(ButtonStyle.Secondary)
		.setCustomId("modal-dev_request_property_modal"),
	new ButtonBuilder()
		.setLabel("Submit Property File")
		.setStyle(ButtonStyle.Secondary)
		.setCustomId("modal-dev_submit_property_modal"),
];

@ApplyOptions<Command.Options>({
	name: "docm-support-announcement",
	description: "Create an announcement for Nøyra's DOCM support services",
	cooldownDelay: 10_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand(
			(command) => {
				command
					.setName(this.name)
					.setDescription(this.description)
					.setDefaultMemberPermissions(
						PermissionFlagsBits.Administrator,
					);
			},
			{ guildIds: ["1200919106266861598"] },
		);
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		const ticketContainer = new ContainerBuilder()
			.setAccentColor(global.embeds.accentColors.default)
			.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`## ${TITLE}`),
			);

		ticketContainer.addSeparatorComponents((separator) => separator);
		ticketContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(MESSAGE),
		);

		ticketContainer.addSeparatorComponents((separator) => separator);

		ticketContainer.addActionRowComponents((actionRow) =>
			actionRow.addComponents(...LINK_BUTTONS),
		);

		ticketContainer.addActionRowComponents((actionRow) =>
			actionRow.addComponents(...ACTION_BUTTONS),
		);

		ticketContainer.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				`-# Last updated <t:${Math.floor(Date.now() / 1000)}:F>`,
			),
		);

		const channel: Channel | null =
			await interaction.client.channels.fetch("735894843548500079");
		if (!channel || !(channel instanceof TextChannel)) {
			return interaction.reply({
				content: "Failed to find the support announcement channel.",
				flags: ["Ephemeral"],
			});
		}

		await channel.send({
			components: [ticketContainer],
			flags: MessageFlagsBitField.Flags.IsComponentsV2,
		});

		return interaction.reply({
			content: "Sent Message",
			flags: ["Ephemeral"],
		});
	}
}
