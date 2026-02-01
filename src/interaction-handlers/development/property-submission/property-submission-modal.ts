import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    Channel,
    EmbedBuilder,
    TextChannel,
    type ModalSubmitInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import Sentry from "@sentry/node";
import { SentryHelper } from "../../../shared/sentry-utils";

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

        return SentryHelper.tracer(interaction, {
            name: "Property Submission Modal",
            op: "modal.propertySubmission",
        }, async (span: any) => {
            const rbxUsername = SpliceUsername(interaction.user.displayName);

            span.setAttribute("submitter.id", interaction.user.id);
            span.setAttribute("submitter.tag", interaction.user.tag);
            span.setAttribute("rbx.username", rbxUsername);
            span.setAttribute("land.permit", landPermit);

            if (propertyFile === null || propertyFile === undefined) {
                span.setStatus({ code: 3, message: "no_property_file_uploaded" });
                span.setAttribute("modal.success", false);
                return interaction.reply({
                    content: `There was an error with your submission. Please ensure you have uploaded a property file.`,
                    flags: ["Ephemeral"],
                });
            }

            const fileName: string = propertyFile.name;
            const fileExtension: string = fileName.slice(fileName.lastIndexOf("."));

            span.setAttribute("file.name", fileName);
            span.setAttribute("file.extension", fileExtension);

            if (!PERMITTED_EXTENSIONS.includes(fileExtension)) {
                span.setStatus({ code: 3, message: "invalid_property_file_extension" });
                span.setAttribute("modal.success", false);

                return interaction.reply({
                    content: `The file you have uploaded is not a valid property file. Please ensure you are uploading a .rbxm file.\nYour Extension: \`\`${fileExtension}\`\``,
                    flags: ["Ephemeral"],
                });
            }

            const fileContent = await fetch(propertyFile.url).then(res => res.arrayBuffer());
            const fileBuffer = Buffer.from(fileContent);

            Sentry.getCurrentScope().addAttachment({
                filename: fileName,
                data: fileBuffer,
                contentType: "application/octet-stream",
            });

            if (!bannerImage.startsWith("rbxassetid://")) {
                bannerImage = `rbxassetid://${bannerImage}`;
            }

            span.setAttribute("banner.image", bannerImage);

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

            span.setAttribute("upload.channel.id", UPLOAD_CHANNEL);

            if (!channel || !(channel instanceof TextChannel)) {
                span.setStatus({ code: 3, message: "no_channel_found" });
                span.setAttribute("modal.success", false);
                span.setAttribute("upload.channel.found", false);

                return interaction.reply({
                    content: `There was an error with your submission. Please use the bug report command if this issue persists.\nError: NO_CHANNEL_FOUND`,
                    flags: ["Ephemeral"],
                });
            }

            // await channel.send({
            //     content: `New property submission request by: ${interaction.user.toString()}`,
            //     embeds: [embed],
            //     components: [actionRow],
            //     files: [
            //         new AttachmentBuilder(fileBuffer, { name: fileName })
            //     ]
            // });

            Sentry.metrics.count("property.development.submission", 1, {
                attributes: {
                    "submitter.id": interaction.user.id,
                    "submitter.tag": interaction.user.tag,
                },
            });

            span.setStatus({ code: 1, message: "submission_successful" });
            span.setAttribute("modal.success", true);

            Sentry.addBreadcrumb({
                category: "action",
                message: `Property submission sent to channel ${UPLOAD_CHANNEL}`,
                level: "info",
            });

            Sentry.captureMessage(`Property Submission: ${rbxUsername} "${fileName}`, {
                level: "info",
                attributes: {
                    "land.permit": landPermit,
                    "submitter.id": interaction.user.id,
                    "submitter.tag": interaction.user.tag,
                    "file.name": fileName,
                    "file.extension": fileExtension,
                    "banner.image": bannerImage,
                    "modal.success": true,
                },
            });

            return interaction.reply({
                content: `Your submission was received successfully and is being reviewed by the Firestone Research and Development Team.`,
                flags: ["Ephemeral"],
            });
        });
    }
}
