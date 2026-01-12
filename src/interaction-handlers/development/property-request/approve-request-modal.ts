import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    EmbedBuilder,
    TextChannel,
    User,
    type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
require("dotenv").config();

import { ApplyOptions } from "@sapphire/decorators";
import { getUserIdFromString } from "../../../shared/useridFromString";

const UPLOAD_CHANNEL = global.ChannelIDs.devSupportTickets;

@ApplyOptions({
    name: "approve-request-modal",
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
        if (!interaction.customId.startsWith(this.name)) {
            return this.none();
        }

        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        interaction.deferReply({ flags: ["Ephemeral"] });
        const propertyFile = interaction.fields.getUploadedFiles("propertyFile", true).first();

        const customId = interaction.customId;
        const messageId = customId.replace("approve-request-modal-", "");

        const channel = interaction.client.channels.cache.get(UPLOAD_CHANNEL) as TextChannel;
        const message = await channel.messages.fetch(messageId);

        const submitterId = getUserIdFromString(interaction.message.content);
        if (!submitterId) {
            await interaction.editReply({ content: "Could not extract submitter ID from message content." });
            throw new Error("Could not extract submitter ID from message content.");
        }

        const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);
        const embed = message.embeds[0];
        const landPermit = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

        const dmChannel = await submitter.createDM();
        await dmChannel.send({
            content: `Your property submission has been approved by ${interaction.user.toString()}.`,
            embeds: [embed],
            files: propertyFile ? [propertyFile] : [],
        });

        const newEmbed = new EmbedBuilder(embed)
            .setColor(global.embeds.embedColors.success)
            .setFooter({ text: `Approved by ${interaction.user.tag}` })
            .setTimestamp();

        await message.edit({
            content: `This property submission has been approved by ${interaction.user.toString()}.`,
            components: [],
            embeds: [newEmbed],
        });

        return interaction.editReply({
            content: `You have approved the property submission for ${landPermit}.`,
        });
    }
}
