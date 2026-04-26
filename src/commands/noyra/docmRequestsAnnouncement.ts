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

const TITLE = "Development Support Tickets";
const MESSAGE = `
**To be ranked in the Commerce group:**
- Post your full username here and ensure you have joined or are pending to join in the [group](https://www.roblox.com/groups/2808791/Firestone-Department-of-Commerce#!/about).
- Tag <@&735894836871299110> stating you need to be ranked.

**To have your ally request accepted:**
- Post your group link here and ensure you are pending.
- Tag <@&735894836871299110> stating that you need the ally request accepted.

**To have your business Twitter followed by [@DOCM_FS](https://twitter.com/DOCMFirestone):**
- Post your Twitter handle here and make sure you are follow [@DOCM_FS](https://twitter.com/DOCMFirestone) back.
- Tag [@DOCM_FS](https://twitter.com/DOCMFirestone) in a Twitter post.
- Tag <@&735894836858847369> stating you want to be followed.

**To obtain a land permit for your business:**
- Please use the "New Property Aquisition" button below to submit your request. Ensure you provide all necessary details and documentation to facilitate the review process.

**To add or remove a representative from your business permit:**
- Post your business permit.
- List the individuals you wish to add or remove.
- Tag <@&735894836858847370>.

**To coordinate an event with the Public Affairs Office:**
- Create a ticket in <#1257093033107652650> for event coordination requests.
- You can check who claims your event by looking here

**To request development support:**
- Look in <#1096981698052370532> and follow the pinned instructions.

**To add your property as an emergency shelter:**
- Ping <@&1085314559532863718> & <@&735894836871299110> with the Trello link to the property.

**Other non-standard requests**
- If you have any other requests, such as abandoning your permit, having traffic direction powers, or anything else that's similar, then tag <@&735894836871299110> with your request.

-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM
-# Please make a ticket in our official discord server for any enquires.
`;

const LINK_BUTTONS: ButtonBuilder[] = [
	new ButtonBuilder()
		.setLabel("Permit Database")
		.setStyle(ButtonStyle.Link)
		.setURL("https://trello.com/b/r4a8Tw1I/commerce-permit-database"),
	new ButtonBuilder()
		.setLabel("Land Management Database")
		.setStyle(ButtonStyle.Link)
		.setURL("https://trello.com/b/v2fxXXhn/land-management-database"),
	new ButtonBuilder()
		.setLabel("Public Affairs Trello")
		.setStyle(ButtonStyle.Link)
		.setURL("https://trello.com/b/EA340Ryc/commerce-public-affairs-office"),
	new ButtonBuilder()
		.setLabel("Support Server")
		.setStyle(ButtonStyle.Link)
		.setURL("https://discord.com/invite/5SdTjEKCdM"),
];

const ACTION_BUTTONS: ButtonBuilder[] = [
	new ButtonBuilder()
		.setLabel("New Property Aquisition")
		.setStyle(ButtonStyle.Secondary)
		.setCustomId("modal-blm_property_request_modal"),
	new ButtonBuilder()
		.setLabel("New Property Activity")
		.setStyle(ButtonStyle.Secondary)
		.setCustomId("modal-blm_property_activity_modal"),
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
	name: "docm-requests-announcement",
	description: "Create an announcement for developer support tickets",
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
				content: "Failed to find the roles announcement channel.",
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
