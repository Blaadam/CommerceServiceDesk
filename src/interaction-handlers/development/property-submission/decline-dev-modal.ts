import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    Channel,
    DMChannel,
    Embed,
    EmbedBuilder,
    Message,
    Snowflake,
    TextChannel,
    User,
    type ModalSubmitInteraction,
} from "discord.js";

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
        const declineReason: string = interaction.fields.getTextInputValue("declineReason");

        const customId: string = interaction.customId;
        const messageId: Snowflake = customId.replace("decline-dev-modal-", "");

        const channel: Channel = interaction.client.channels.cache.get(UPLOAD_CHANNEL);

        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.editReply({ content: "Upload channel not found or is not a text channel." });
        }

        const message: Message = await channel.messages.fetch(messageId);

        const submitter: User | undefined = message.mentions.users.first();

        if (!submitter) {
            return interaction.reply({ content: "Could not find the submitter from the message mentions.", ephemeral: true });
        }

        const embed: Embed = message.embeds[0];
        const landPermit: string = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

        const dmChannel: DMChannel | undefined = await submitter.createDM();

        if (!dmChannel) {
            return interaction.reply({ content: "Could not create DM channel with the submitter.", ephemeral: true });
        }

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
