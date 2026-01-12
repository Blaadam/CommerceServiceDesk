import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    EmbedBuilder,
    TextChannel,
    type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
require("dotenv").config();

import { ApplyOptions } from "@sapphire/decorators";

const UPLOAD_CHANNEL = global.ChannelIDs.devSupportTickets;

@ApplyOptions({
    name: "decline-dev-modal",
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

        const customId = interaction.customId;
        const messageId = customId.replace("decline-dev-modal-", "");

        const channel = interaction.client.channels.cache.get(UPLOAD_CHANNEL) as TextChannel;
        const message = await channel.messages.fetch(messageId);

        const submitter = message.mentions.users.first();
        const embed = message.embeds[0];
        const landPermit = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

        const dmChannel = await submitter.createDM();
        await dmChannel.send({
            content: `Your property submission has been declined by ${interaction.user.toString()} for the following reason:\n\n${declineReason}`,
            embeds: [embed],
        });

        const newEmbed = new EmbedBuilder(embed)
            .setColor(global.embeds.embedColors.error)
            .addFields({ name: "Decline Reason", value: declineReason })
            .setFooter({ text: `Declined by ${interaction.user.tag}` })
            .setTimestamp();

        await message.edit({
            content: `This property submission has been declined by ${interaction.user.toString()}.`,
            components: [],
            embeds: [newEmbed],
        });

        return interaction.reply({
            content: `You have declined the property submission for ${landPermit}.`,
            flags: ["Ephemeral"],
        });
    }
}
