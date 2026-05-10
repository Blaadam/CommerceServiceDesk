import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	ActionRowBuilder,
	Attachment,
	ButtonBuilder,
	ButtonStyle,
	Channel,
	Collection,
	EmbedBuilder,
	ReadonlyCollection,
	TextChannel,
	type ModalSubmitInteraction,
} from "discord.js";
import axios from "axios";
import { ApplyOptions } from "@sapphire/decorators";
import Sentry from "@sentry/node";
import { SentryHelper } from "../../../shared/sentry-utils";

const PERMITTED_EXTENSIONS = [".rbxm"];
const UPLOAD_CHANNEL = global.ChannelIDs.devSupportTickets;

function SpliceUsername(username: string) {
	const spliced = username.split(" ");
	return spliced[spliced.length - 1];
}

@ApplyOptions({
	name: "dev-request-extra-modal",
})
export class ModalHandler extends InteractionHandler {
	public constructor(
		ctx: InteractionHandler.LoaderContext,
		options: InteractionHandler.Options,
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
		const businessLicense: string | null =
			interaction.fields.getTextInputValue("businessLicense");
		const propertyFiles: ReadonlyCollection<string, Attachment> =
			interaction.fields.getUploadedFiles("extraFiles") ||
			new Collection<string, Attachment>();
		const furtherInformation: string | null =
			interaction.fields.getTextInputValue("furtherInformation");

		if (!businessLicense) {
			return interaction.reply({
				content:
					"Business license is required to submit an extra dev request.",
				flags: ["Ephemeral"],
			});
		}

		return SentryHelper.tracer(
			interaction,
			{
				name: "Extra Dev Request Modal",
				op: "modal.extraDevRequest",
			},
			async (span: any) => {
				const rbxUsername: string = SpliceUsername(
					interaction.user.displayName,
				);

				span.setAttribute("submitter.id", interaction.user.id);
				span.setAttribute("submitter.tag", interaction.user.tag);
				span.setAttribute("rbx.username", rbxUsername);
				span.setAttribute("business.license", businessLicense);

				const urls: Record<string, string> = {};

				if (propertyFiles?.size > 0) {
					span.setAttribute("file.attached", true);
					span.setAttribute("file.count", propertyFiles.size);

					const fileNames = propertyFiles
						.map((file) => file.name)
						.join(", ");
					span.setAttribute("file.names", fileNames);

					for (const file of propertyFiles.values()) {
						const fileName: string = file.name;
						const fileExtension: string = fileName.slice(
							fileName.lastIndexOf("."),
						);
						urls[fileName] = file.url;

						if (!PERMITTED_EXTENSIONS.includes(fileExtension)) {
							span.setStatus({
								code: 3,
								message: "invalid_property_file_extension",
							});
							span.setAttribute("modal.success", false);

							return interaction.reply({
								content: `One or more of the files you have uploaded is not a valid roblox model file. Please ensure you are uploading .rbxm files.\nInvalid Extension: \`\`${fileExtension}\`\``,
								flags: ["Ephemeral"],
							});
						}
					}
				} else {
					span.setAttribute("file.attached", false);
					span.setStatus({ code: 2, message: "no_file_attached" });
					span.setAttribute("modal.success", false);
				}

				const fileBuffers: { name: string; buffer: Buffer }[] = [];

				for (const [fileName, url] of Object.entries(urls)) {
					const fileContent: ArrayBuffer = await fetch(url).then(
						(res) => res.arrayBuffer(),
					);
					const fileBuffer = Buffer.from(fileContent);

					Sentry.getCurrentScope().addAttachment({
						filename: fileName,
						data: fileBuffer,
						contentType: "application/octet-stream",
					});

					fileBuffers.push({ name: fileName, buffer: fileBuffer });
				}

				const embed = new EmbedBuilder()
					.setTitle("New Extra Dev Request")
					.setColor(global.embeds.embedColors.mgmt)
					.addFields(
						{ name: "Submitted By", value: rbxUsername },
						{ name: "Business License", value: businessLicense },
						{
							name: "Further Information",
							value: furtherInformation || "N/A",
						},
					)
					.setFooter(global.embeds.embedFooter)
					.setTimestamp();

				const approveButton = new ButtonBuilder()
					.setCustomId("approve-extra-dev-request")
					.setLabel("Approve")
					.setStyle(ButtonStyle.Success);

				const declineButton = new ButtonBuilder()
					.setCustomId("decline-extra-dev-request")
					.setLabel("Decline")
					.setStyle(ButtonStyle.Danger);

				const actionRow =
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						approveButton,
						declineButton,
					);

				const channel: Channel | undefined =
					interaction.client.channels.cache.get(UPLOAD_CHANNEL);

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

				try {
					const embedMessage = await channel.send({
						content: `New extra dev request by: ${interaction.user.toString()}\n<@&${global.RoleIDs.v2Devs}>`,
						embeds: [embed],
						components: [actionRow],
					});

					if (fileBuffers.length > 0) {
						// discord.js uses undici which drops the socket before sending
						// multipart payloads — use axios (Node https module) instead.
						const boundary = `----DiscordFormBoundary${Date.now().toString(16)}`;
						const CRLF = "\r\n";
						const payloadJson = JSON.stringify({
							message_reference: {
								message_id: embedMessage.id,
								channel_id: channel.id,
								fail_if_not_exists: false,
							},
						});

						const parts: Buffer[] = [
							Buffer.from(
								`--${boundary}${CRLF}` +
									`Content-Disposition: form-data; name="payload_json"${CRLF}` +
									`Content-Type: application/json${CRLF}${CRLF}` +
									`${payloadJson}${CRLF}`,
							),
						];

						fileBuffers.forEach(({ name, buffer }, index) => {
							parts.push(
								Buffer.from(
									`--${boundary}${CRLF}` +
										`Content-Disposition: form-data; name="files[${index}]"; filename="${name}"${CRLF}` +
										`Content-Type: application/octet-stream${CRLF}${CRLF}`,
								),
								buffer,
								Buffer.from(CRLF),
							);
						});

						parts.push(Buffer.from(`--${boundary}--${CRLF}`));

						const body = Buffer.concat(parts);

						await axios.post(
							`https://discord.com/api/v10/channels/${channel.id}/messages`,
							body,
							{
								headers: {
									Authorization: `Bot ${interaction.client.token}`,
									"Content-Type": `multipart/form-data; boundary=${boundary}`,
									"Content-Length": body.length,
								},
							},
						);
					}
				} catch (error) {
					console.error("Failed to send message:", error);
					span.setStatus({ code: 2, message: "send_failed" });
					span.setAttribute("modal.success", false);
					return interaction.reply({
						content:
							"Error sending the submission to the internal channel.",
						flags: ["Ephemeral"],
					});
				}

				Sentry.metrics.count("extra.development.submission", 1, {
					attributes: {
						"submitter.id": interaction.user.id,
						"submitter.tag": interaction.user.tag,
					},
				});

				Sentry.addBreadcrumb({
					category: "action",
					message: `Extra dev request sent to channel ${UPLOAD_CHANNEL}`,
					level: "info",
				});

				Sentry.captureMessage(`Extra Dev Request: ${rbxUsername}`, {
					level: "info",
					attributes: {
						"business.license": businessLicense,
						"submitter.id": interaction.user.id,
						"submitter.tag": interaction.user.tag,
						"modal.success": true,
					},
				});

				return interaction.reply({
					content: `Your submission was received successfully and is being reviewed by the Firestone Research and Development Team.`,
					flags: ["Ephemeral"],
				});
			},
		);
	}
}
