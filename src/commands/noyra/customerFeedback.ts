import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    AttachmentBuilder,
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

const AD_HEADER = "Nøyra - Request for Customer Feedback";

const MESSAGE = `
**We Value Your Feedback**

At Nøyra, we are committed to providing exceptional consulting and development services. To ensure we continue to meet and exceed your expectations, we invite you to share your feedback with us. Your insights help us improve our offerings and better serve you.

Whether you've utilized our automation services, IT advisory, property development, or any of our other solutions, we want to hear about your experience. Your feedback is crucial in helping us understand what we're doing well and where we can enhance our services.

__SPLIT__

-# Commerce Service Desk is a service developed and managed by Nøyra.
-# Join our Discord for any inquiries: https://discord.gg/5SdTjEKCdM
`

const BUTTONS = [
    new ButtonBuilder()
        .setLabel("Submit Feedback")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("modal-noyra_customer_rating_modal"),
    new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/5SdTjEKCdM"),
]

@ApplyOptions<Command.Options>({
    name: "customer-feedback",
    description: "Request customer feedback for Nøyra's services",
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
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user to send the feedback request to")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("message")
                        .setDescription("An optional message to send in the feedback request")
                        .setRequired(false)
                );
        }, { guildIds: ["1200919106266861598"] });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        const targetUser = interaction.options.getUser("user", true);
        const customMessage = interaction.options.getString("message");

        const feedbackContainer = new ContainerBuilder()
            .setAccentColor(global.embeds.accentColors.noyra)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `## ${AD_HEADER}`
                ),
            );

        feedbackContainer.addSeparatorComponents((separator) => separator)

        const messageParts = MESSAGE.trim().split("__SPLIT__");

        feedbackContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(messageParts[0])
        );

        if (customMessage) {
            feedbackContainer.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`**Customer Message**\n\n${customMessage}`)
            );
        }

        feedbackContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(messageParts[1])
        );

        feedbackContainer.addSeparatorComponents((separator) => separator);

        feedbackContainer.addActionRowComponents((actionRow) =>
            actionRow.addComponents(...BUTTONS)
        );

        feedbackContainer.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `-# Last updated <t:${Math.floor(Date.now() / 1000)}:F>`
            )
        );

        // const channel: Channel = await interaction.client.channels.fetch(global.ChannelIDs.rolesChannel);
        const channel: Channel = await interaction.client.channels.fetch("1445046543316025576");
        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.reply({
                content: "Failed to find the roles announcement channel.",
                flags: ["Ephemeral"],
            });
        }

        const dmChannel = targetUser.dmChannel || await targetUser.createDM();
        if (!dmChannel || !dmChannel.isSendable()) {
            return interaction.reply({
                content: "Failed to create a DM channel with the target user.",
                flags: ["Ephemeral"],
            });
        }

        dmChannel.send({ components: [feedbackContainer], flags: MessageFlagsBitField.Flags.IsComponentsV2 });

        return interaction.reply({
            content: "Sent Message",
            flags: ["Ephemeral"],
        });
    }
}
