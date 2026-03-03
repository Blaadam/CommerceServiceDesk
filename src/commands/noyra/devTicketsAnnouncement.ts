import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    ActionRowBuilder,
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
Hello everyone,

The Development Support Guidelines have been updated to bring development support within the State of Firestone up to the modern age. All entities are expected to comply with the latest revision (rev 3.0); failure to do so will result in a loss of development support.

### Updated Commands
__SPLIT__

**For the entire list of slash-commands, type \`/\` and click on Commerce Service Desk.**

-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM
-# Please make a ticket in our official discord server for any enquires.
`

const COMMANDS: { name: string; description: string, tag?: string }[] = [
    { name: "dev-request-property", description: "Make a request for a property file", tag: "DEV" },
    { name: "dev-submit-property", description: "Submit a property file for review", tag: "DEV" },
    { name: "dev-request-extra", description: "Submit an extra request for review. Files can be attached.", tag: "DEV" },
    { name: "dev-request-backlog", description: "View the backlog of property requests.", tag: "DEV" },
    { name: "new-activity", description: "Create a new property activity submission", tag: "BLM" },
    { name: "new-request", description: "Create a new property request", tag: "BLM" },
];

const LINK_BUTTONS: { name: string; link: string }[] = [
    { name: "View Guidelines (v3.0)", link: "https://drive.google.com/file/d/1dwJHs0ghmGtOynGFxhhBb1CulixVuAGY/view?usp=sharing" },
    { name: "Tool Submission Tutorial", link: "https://www.youtube.com/watch?v=X2out-3ml8Q" },
    { name: "Support Server", link: "https://discord.com/invite/5SdTjEKCdM" },
];

const ACTION_BUTTONS: { name: string; customId: string }[] = [
    { name: "Request Property File", customId: "modal-dev_request_property_modal" },
    { name: "Submit Property File", customId: "modal-dev_submit_property_modal" },
    { name: "Make Extra Request", customId: "modal-dev_request_extra_modal" },

    { name: "New Property Activity", customId: "modal-blm_property_activity_modal" },
    { name: "New Property Aquisition", customId: "modal-blm_property_request_modal" },
]

@ApplyOptions<Command.Options>({
    name: "dev-tickets-announcement",
    description: "Create an announcement for developer support tickets",
    cooldownDelay: 10_000,
})
export default class ViewHistoryCommand extends Command {
    public override registerApplicationCommands(
        registry: ApplicationCommandRegistry
    ) {
        registry.registerChatInputCommand((command) => {
            command
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
        }, { guildIds: [ "1200919106266861598" ] });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        const ticketContainer = new ContainerBuilder()
            .setAccentColor(global.embeds.accentColors.default)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `## ${TITLE}`
                ),
            );

        const messageParts = MESSAGE.split("__SPLIT__");

        ticketContainer.addSeparatorComponents((separator) => separator)
        ticketContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(messageParts[0])
        )

        for (let i = 0; i < COMMANDS.length; i += 3) {
            for (const command of COMMANDS.slice(i, i + 3)) {
                ticketContainer.addTextDisplayComponents(
                    (textDisplay) =>
                        textDisplay.setContent(
                            `\`/${command.name}\`${command.tag ? ` (${command.tag})` : ""}\n${command.description}`
                        ),
                );
            }
        }

        ticketContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(messageParts[1])
        )

        ticketContainer.addSeparatorComponents((separator) => separator);

        const linkButtons = new ActionRowBuilder<ButtonBuilder>();

        for (const button of LINK_BUTTONS) {
            linkButtons.addComponents(
                new ButtonBuilder()
                    .setLabel(button.name)
                    .setStyle(ButtonStyle.Link)
                    .setURL(button.link),
            )
        }

        const actionButtons = new ActionRowBuilder<ButtonBuilder>();

        for (const button of ACTION_BUTTONS) {
            actionButtons.addComponents(
                new ButtonBuilder()
                    .setLabel(button.name)
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(button.customId),
            )
        }

        ticketContainer.addActionRowComponents(linkButtons);
        ticketContainer.addActionRowComponents(actionButtons);

        ticketContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `-# Last updated <t:${Math.floor(Date.now() / 1000)}:F>`
            )
        );

        const channel: Channel = await interaction.client.channels.fetch(global.ChannelIDs.devSupportTextTickets);
        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.reply({
                content: "Failed to find the roles announcement channel.",
                flags: ["Ephemeral"],
            });
        }

        await channel.send({ components: [ticketContainer], flags: MessageFlagsBitField.Flags.IsComponentsV2 });

        return interaction.reply({
            content: "Sent Message",
            flags: ["Ephemeral"],
        });

    }
}
