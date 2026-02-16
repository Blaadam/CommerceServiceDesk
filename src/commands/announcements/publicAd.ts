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

const AD_HEADER = "Nøyra - Your Trusted Consulting Partner\nNøyra provides expert consultation and infrastructure services. We focus on optimizing operations, offering reliable support, and delivering tailored services to meet the unique needs of each client.";

const MESSAGE = `
**About Nøyra**

Nøyra is a comprehensive consulting and development firm specializing in automation services, IT advisory, property development, and renovation solutions. Our expertise spans across multiple domains:

> - **Automation Services** - We design and implement cutting-edge automation systems to streamline your operations and increase efficiency.
> - **IT Advisory** - Our experienced consultants provide strategic guidance on technology infrastructure, digital transformation, and system optimization.
> - **IT Transformation Services** - We help organizations modernize their IT infrastructure, migrate to cloud solutions, and implement scalable systems for sustainable growth.
> - **Property Development** - From concept to completion, we manage innovative development projects tailored to modern standards and requirements.
> - **Renovation Services** - We deliver high-quality renovation and refurbishment solutions that breathe new life into existing spaces.
> - **Documentation Services** - We create comprehensive, professional documentation for your systems, processes, and technical infrastructure.

__SPLIT__

-# Commerce Service Desk is a service developed and managed by Nøyra.
-# Join our Discord for any inquiries: https://discord.gg/5SdTjEKCdM
`

const BUTTONS = [
    new ButtonBuilder()
        .setLabel("Roblox Community")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.roblox.com/communities/824968029"),
    new ButtonBuilder()
        .setLabel("Discord Server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/5SdTjEKCdM"),
    new ButtonBuilder()
        .setLabel("Service Portfolio")
        .setStyle(ButtonStyle.Link)
        .setURL("https://twitter.com/NoyraConsulting"),
    new ButtonBuilder()
        .setLabel("Business Permit")
        .setStyle(ButtonStyle.Link)
        .setURL("https://trello.com/c/w6MdNRAY/")
]

@ApplyOptions<Command.Options>({
    name: "public-ad",
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
        }, { guildIds: ["1200919106266861598"] });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        const adContainer = new ContainerBuilder()
            .setAccentColor(global.embeds.accentColors.noyra)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `## ${AD_HEADER}`
                ),
            );

        const files = [
            new AttachmentBuilder("/app/data/noyra_office_fs.png", { name: "noyra_office_fs.png" })
        ]

        adContainer.addSeparatorComponents((separator) => separator)

        var fileIndex = 0;
        for (const part of MESSAGE.trim().split("__SPLIT__")) {
            adContainer.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(part)
            );
            files[fileIndex] && adContainer.addMediaGalleryComponents((gallery) =>
                gallery.addItems((item) =>
                    item.setURL(
                        `attachment://${files[fileIndex].name}`,
                    )
                )
            );

            fileIndex++;
        }

        adContainer.addSeparatorComponents((separator) => separator);

        adContainer.addActionRowComponents((actionRow) =>
            actionRow.addComponents(...BUTTONS)
        );

        adContainer.addTextDisplayComponents((textDisplay) =>
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

        channel.send({ components: [adContainer], flags: MessageFlagsBitField.Flags.IsComponentsV2, files });

        return interaction.reply({
            content: "Sent Message",
            flags: ["Ephemeral"],
        });

    }
}
