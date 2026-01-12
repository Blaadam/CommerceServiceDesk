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
        await interaction.deferReply({ flags: ["Ephemeral"] });

        SentryHelper.tracer(interaction, {
            name: "Approve Property Request Modal",
            op: "interaction.handler.property-request.approve",
        }, async (span) => {
            try {
                const propertyFile = interaction.fields.getUploadedFiles("propertyFile", true).first();
                const customId: string = interaction.customId;
                const messageId: Snowflake = customId.replace("approve-request-modal-", "");

                span.setAttribute("interaction.messageId", messageId);
                span.setAttribute("interaction.hasPropertyFile", !!propertyFile);

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
                    content: `Your property submission has been approved by ${interaction.user.toString()}.`,
                    embeds: [embed],
                    files: propertyFile ? [propertyFile] : [],
                });

                span.setAttribute("interaction.status", "success");
                span.setStatus({ code: 1 });

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
            catch (error) {
                span.setAttribute("interaction.status", "error");
                span.setAttribute("error.message", (error as Error).message);
                span.setStatus({ code: 2 });

                Sentry.captureException(error, { extra: { interactionData: interaction } });
                return interaction.editReply({
                    content: "An error occurred while processing the approval. Please try again later. If this issue persists, please file a bug report."
                });
            }
        });
    }
}
