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
import { getUserIdFromString } from "../../../shared/useridFromString";
import { SentryHelper } from "../../../shared/sentry-utils";
import Sentry from "@sentry/node";

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
        await interaction.deferReply({ flags: ["Ephemeral"] });

        SentryHelper.tracer(interaction, {
            name: "Decline Property Request Modal",
            op: "interaction.handler.property-request.decline",
        }, async (span) => {
            const declineReason = interaction.fields.getTextInputValue("declineReason");
            span.setAttribute("interaction.declineReason", declineReason);

            const customId: string = interaction.customId;
            const messageId: Snowflake = customId.replace("decline-request-modal-", "");
            span.setAttribute("interaction.messageId", messageId);

            const channel: Channel = interaction.client.channels.cache.get(UPLOAD_CHANNEL);
            span.setAttribute("interaction.uploadChannelId", channel?.id || "undefined");

            if (!channel || !(channel instanceof TextChannel)) {
                span.setAttribute("interaction.status", "failed");
                span.setAttribute("interaction.response", "Upload channel not found or is not a text channel.");
                span.setStatus({ code: 2 });

                return interaction.editReply({ content: "Upload channel not found or is not a text channel." });
            }

            const message: Message = await channel.messages.fetch(messageId);
            if (!message) {
                span.setAttribute("interaction.status", "failed");
                span.setAttribute("interaction.response", "Original message not found.");
                span.setStatus({ code: 2 });

                return interaction.editReply({ content: "Original message not found." });
            }

            const submitterId: string = getUserIdFromString(interaction.message.content);
            if (!submitterId) {
                span.setAttribute("interaction.status", "failed");
                span.setAttribute("interaction.response", "Could not extract submitter ID from message content.");
                span.setStatus({ code: 2 });

                return await interaction.editReply({ content: "Could not extract submitter ID from message content." });
            }

            const submitter: User = interaction.client.users.cache.get(submitterId) || await interaction.client.users.fetch(submitterId);
            const embed: Embed = message.embeds[0];
            const landPermit: string = embed.fields.find(field => field.name === "Land Permit")?.value || "unknown";

            span.setAttribute("interaction.submitterId", submitter.id);
            span.setAttribute("interaction.landPermit", landPermit);

            const dmChannel: DMChannel | undefined = await submitter.createDM();

            if (!dmChannel) {
                span.setAttribute("interaction.status", "failed");
                span.setAttribute("interaction.response", "Could not create DM channel with the submitter.");
                span.setStatus({ code: 2 });

                return await interaction.editReply({ content: "Could not create DM channel with the submitter." });
            }

            await dmChannel.send({
                content: `Your property request has been declined by ${interaction.user.toString()} for the following reason:\n\n${declineReason}`,
                embeds: [embed],
            });

            span.setAttribute("interaction.status", "success");
            span.setStatus({ code: 1 });

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

            Sentry.metrics.count("property.development.request.declined", 1, {
                attributes: {
                    "developer.id": interaction.user.id,
                    "developer.tag": interaction.user.tag,

                    "submitter.id": submitter.id,
                    "submitter.tag": submitter.tag,
                }
            });

            return interaction.editReply({
                content: `You have declined the property request for ${landPermit}.`,
            });
        });
    }
}
