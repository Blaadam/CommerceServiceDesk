import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Channel,
    EmbedBuilder,
    TextChannel,
    type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
require("dotenv").config();

import { ApplyOptions } from "@sapphire/decorators";

const PERMITTED_EXTENSIONS = [".rbxm"];
const UPLOAD_CHANNEL = global.ChannelIDs.devSupportTickets;

function SpliceUsername(username: string) {
    const spliced = username.split(" ")
    return spliced[spliced.length - 1]
}

@ApplyOptions({
    name: "property-submission-modal",
})
export class ModalHandler extends InteractionHandler {
    public constructor(
        ctx: InteractionHandler.LoaderContext,
        options: InteractionHandler.Options
    ) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
        });
    }

    public override parse(interaction: ModalSubmitInteraction) {
        if (interaction.customId !== this.name) return this.none();

        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        const landPermit: string = interaction.fields.getTextInputValue("landPermit");
        const propertyFile = interaction.fields.getUploadedFiles("propertyFile", true).first();
        let bannerImage = interaction.fields.getTextInputValue("bannerImage");
        const furtherInformation: string = interaction.fields.getTextInputValue("furtherInformation");

        const rbxUsername = SpliceUsername(interaction.user.displayName);

        if (propertyFile === null || propertyFile === undefined) {
            return interaction.reply({
                content: `There was an error with your submission. Please ensure you have uploaded a property file.`,
                flags: ["Ephemeral"],
            });
        }

        const fileName: string = propertyFile.name;
        const fileExtension: string = fileName.slice(fileName.lastIndexOf("."));

        if (!PERMITTED_EXTENSIONS.includes(fileExtension)) {
            return interaction.reply({
                content: `The file you have uploaded is not a valid property file. Please ensure you are uploading a .rbxm file.\nYour Extension: \`\`${fileExtension}\`\``,
                flags: ["Ephemeral"],
            });
        }

        if (!bannerImage.startsWith("rbxassetid://")) {
            bannerImage = `rbxassetid://${bannerImage}`;
        }

        const embed = new EmbedBuilder()
            .setTitle("New Property Submission")
            .setColor(global.embeds.embedColors.mgmt)
            .addFields(
                { name: "Submitted By", value: rbxUsername },
                { name: "Land Permit", value: landPermit },
                { name: "Banner Image", value: bannerImage },
                { name: "Further Information", value: furtherInformation || "N/A" },
            )
            .setFooter(global.embeds.embedFooter)
            .setTimestamp();

        const approveButton = new ButtonBuilder()
            .setCustomId("approve-property-submission")
            .setLabel("Approve")
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId("decline-property-submission")
            .setLabel("Decline")
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            approveButton,
            declineButton
        );

        const channel: Channel | undefined = interaction.client.channels.cache.get(UPLOAD_CHANNEL);
        
        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.reply({
                content: `There was an error with your submission. Please use the bug report command if this issue persists.\nError: NO_CHANNEL_FOUND`,
                flags: ["Ephemeral"],
            });
        }

        await channel.send({
            content: `New property submission request by: ${interaction.user.toString()}`,
            embeds: [embed],
            components: [actionRow],
            files: [propertyFile.url],
        });

        return interaction.reply({
            content: `Your submission was received successfully and is being reviewed by the Firestone Research and Development Team.`,
            flags: ["Ephemeral"],
        });
    }
}
