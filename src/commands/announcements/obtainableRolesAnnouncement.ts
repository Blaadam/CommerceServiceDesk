import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    ButtonStyle,
    Channel,
    ContainerBuilder,
    MessageFlagsBitField,
    PermissionFlagsBits,
    TextChannel,
    type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

const MESSAGE_PART1: string[] = [
    "Hello everyone,",
    "We're introducing three optional notification roles that allow you to stay informed about specific updates and announcements relevant to your interests within the Department of Commerce.",
];

const ROLES: { name: string; description: string }[] = [
    { name: "LM-NOTIF-OPT", description: "Receive Land Management updates and discussions" },
    { name: "OPA-NOTIF-OPT", description: "Get announcements from the Office of Public Affairs" },
    { name: "IO-NOTIF-OPT", description: "Receive notifications from the Inspections Office" },
];

const MESSAGE_PART2: string[] = [
    "Best regards,",
    "Firestone Department of Commerce: Discord Server Team"
]

const DISCLAIMER_TEXT: string[] = [
    "Commerce Service Desk is a service developed and managed by Nøyra.",
    "Join our Discord for any inquiries: https://discord.gg/5SdTjEKCdM"
]

@ApplyOptions<Command.Options>({
    name: "roles-announcement",
    description: "Create an announcement for obtainable roles",
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
        });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        const rolesContainer = new ContainerBuilder()
            .setAccentColor(global.embeds.accentColors.default)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    "## Notice of Obtainable Roles"
                ),
            );

        rolesContainer.addSeparatorComponents((separator) => separator)
        rolesContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(MESSAGE_PART1.join("\n"))
        )

        for (const role of ROLES) {
            rolesContainer.addSectionComponents((section) =>
                section
                    .setButtonAccessory((button) =>
                        button.setCustomId(`enroll_${role.name}`).setLabel(`${role.name}`).setStyle(ButtonStyle.Success),
                    )
                    .addTextDisplayComponents(
                        (textDisplay) =>
                            textDisplay.setContent(
                                `${role.name}`
                            ),
                        (textDisplay) => textDisplay.setContent(role.description),
                    ),
            );
        }

        rolesContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(MESSAGE_PART2.join("\n"))
        )

        rolesContainer.addSeparatorComponents((separator) => separator);

        rolesContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`-# ${DISCLAIMER_TEXT.join("\n-# ")}`)
        );

        rolesContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `-# Last updated <t:${Math.floor(Date.now() / 1000)}:F>`
            )
        );

        const channel: Channel = await interaction.client.channels.fetch(global.ChannelIDs.rolesChannel);
        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.reply({
                content: "Failed to find the roles announcement channel.",
                flags: ["Ephemeral"],
            });
        }
        channel.send({ components: [rolesContainer], flags: MessageFlagsBitField.Flags.IsComponentsV2 });

        return interaction.reply({
            content: "Sent Message",
            flags: ["Ephemeral"],
        });

    }
}
