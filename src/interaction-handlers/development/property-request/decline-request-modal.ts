import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    Channel,
    DMChannel,
    Embed,
    EmbedBuilder,
    Snowflake,
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
    name: "decline-request-modal",
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
        const declineReason = interaction.fields.getTextInputValue("declineReason");

        const customId: string = interaction.customId;
        const messageId: Snowflake = customId.replace("decline-request-modal-", "");

        const channel: Channel = interaction.client.channels.cache.get(UPLOAD_CHANNEL);
        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.editReply({ content: "Upload channel not found or is not a text channel." });
        }

        const message = await channel.messages.fetch(messageId);
        const submitterId = getUserIdFromString(interaction.message.content);
        if (!submitterId) {
            return interaction.reply({ content: "Could not extract submitter ID from message content.", ephemeral: true });
            throw new Error("Could not extract submitter ID from message content.");
        }

        const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);

        const embed: Embed = message.embeds[0];
        const landPermit: string = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

        const dmChannel: DMChannel | undefined = await submitter.createDM();
        if (!dmChannel) {
            await interaction.editReply({ content: "Could not create DM channel with the submitter." });
            return;
        }
        
        await dmChannel.send({
            content: `Your property request has been declined by ${interaction.user.toString()} for the following reason:\n\n${declineReason}`,
            embeds: [embed],
        });

        const newEmbed = new EmbedBuilder(embed)
            .setColor(global.embeds.embedColors.error)
            .addFields({ name: "Decline Reason", value: declineReason })
            .setFooter({ text: `Declined by ${interaction.user.tag}` })
            .setTimestamp();

        await message.edit({
            content: `This property request has been declined by ${interaction.user.toString()}.`,
            components: [],
            embeds: [newEmbed],
        });

        return interaction.reply({
            content: `You have declined the property request for ${landPermit}.`,
            flags: ["Ephemeral"],
        });
    }
}
