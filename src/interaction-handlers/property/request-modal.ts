import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	TextChannel,
	type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
import axios from "axios";
import * as Sentry from "@sentry/node";

import { databaseConnection } from "../../database";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils";
const connection = new databaseConnection();

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const ADDON = `?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

const REQUEST_LIST_ID = "6420a5767b2828fea92316e6"

const Settings = {
	AreaListIds: {
		// Default Cities
		"Redwood": ["641e1077958b7e7aeb847a48"],
		"Arborfield": ["641e108a923770039e58f70b"],
		"Prominence": ["641e108172f11b32b2cd1d7a"],

		// Unincorporated
		"Unincorporated": ["641e15dc99f278f73fcfbb9e"],
		"Greendale": ["641e174a2bdd24d0cb8ac85f", "Unincorporated"],
		"Hillview": ["641e17536f76c164213b94b0", "Unincorporated"],

		// Stadium Lots
		"Triumph Stadium": ["641e16219cd033f2188ff043", "Prominence"],
		"Lunar Arena": ["64c99bd2e6ac1002eda1ae5b", "Prominence"],
	},
	LabelIds: {
		"Prominence": ["641e0d512e15ff6a3be2b6ba"],
		"Redwood": ["641e0d6a7c2b18c899627dcf"],
		"Arborfield": ["641e0d784e470de8bccd151e"],
		"Unincorporated": ["6423ba519eaba3c931bd402f"],
	}
}

async function PublishCard(Title, Description, Labels, Managers) {
	const url = `https://api.trello.com/1/cards${ADDON}`
	const response = await axios({
		"method": 'post',
		"url": url,
		data: {
			"name": Title,
			"desc": Description,
			"idList": REQUEST_LIST_ID,
			"idLabels": Labels || null,
			"idMembers": Managers || null
		},
		headers: { "Content-Type": "application/json" }
	})

	return response.data
}

function SpliceUsername(Username) {
	const Spliced = Username.split(" ")
	return Spliced[Spliced.length - 1]
}

// Grabs the manager for a district
async function GetManagersFromDistrict(district: string) {
	const table = connection.prisma.managerTable
	const rows = await table.findMany({ where: { District: district } });
	return rows;
}

function GetDistrictFromID(ListID) {
	let District = ""
	for (let key in Settings.AreaListIds) {
		const Data = Settings.AreaListIds[key]
		if (Data[0] == ListID) {
			District = Data[1] || key
			break
		}
	}
	if (District == "") {
		return null
	}
	return District
}

@ApplyOptions({
	name: "request-modal",
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
		const businessPermit: string = interaction.fields.getTextInputValue("businessPermit");
		const businessGroup: string = interaction.fields.getTextInputValue("businessGroup");
		const propertiesBefore: string = interaction.fields.getTextInputValue("propertiesBefore");
		const requestedLand: string = interaction.fields.getTextInputValue("requestedLand");
		const propertyUse: string = interaction.fields.getTextInputValue("propertyUse");

		return SentryHelper.tracer(interaction, {
			name: "Property Request Modal Submission",
			op: "property.request_modal",
			attributes: {
				"modal.custom_id": interaction.customId,
			},
		}, async (span) => {
			try {
				span.setAttribute("user.id", interaction.user.id);
				span.setAttribute("user.tag", interaction.user.tag);

				span.setAttribute("interaction.id", interaction.id);
				span.setAttribute("interaction.customId", interaction.customId);

				if (!businessPermit || !businessGroup || !propertiesBefore || !requestedLand || !propertyUse) {
					span.setAttribute("command.status", "failed");
					span.setAttribute("command.status_reason", "missing_fields");
					span.setStatus({ code: 2, message: "missing_fields" });

					return interaction.reply({
						content: "You did not fill in the field correctly.",
						flags: ["Ephemeral"],
					});
				}

				const robloxName: string = SpliceUsername(interaction.user.displayName)

				span.setAttribute("user.robloxName", robloxName);
				span.setAttribute("property.requested_land_url", requestedLand);

				if (!requestedLand.includes("trello.com/c/")) {
					span.setAttribute("command.status", "failed");
					span.setAttribute("command.status_reason", "invalid_trello_link");

					return interaction.reply({
						content: "You did not specify a trello link.",
						flags: ["Ephemeral"],
					});
				}

				span.setAttribute("trello.card_url", requestedLand);

				const CardTitle: string[] = requestedLand.split("/c/")

				if (!CardTitle[1]) {
					return interaction.reply({
						content: "You did not specify a trello link.\nPlease use the bug report command if the issue persists.",
						flags: ["Ephemeral"],
					});
				}

				const CardID: string = CardTitle[1].split("/")[0]
				span.setAttribute("trello.card_id", CardID);

				const card_url: string = `https://api.trello.com/1/cards/${CardID}`

				// Fetch Trello Card Data
				const response = await Sentry.startSpan({
					name: "Fetch Trello Card Data",
					op: "axios.trello.fetch_trello_card",
					attributes: {
						"trello.card_url": card_url,
					},
				}, async (childSpan) => {
					try {
						const res = await axios({
							method: "get",
							url: card_url + ADDON,
							headers: {
								"Accept": "application/json"
							}
						});

						childSpan.setStatus({ code: 1 });
						return res;
					}
					catch (error) {
						childSpan.setStatus({ code: 2, message: "trello_card_fetch_failed" });

						span.setAttribute("command.status", "failed");
						span.setAttribute("command.status_reason", "trello_card_fetch_failed");

						Sentry.captureException(error);

						await interaction.reply({
							content: "Unable to fetch Trello card.\nPlease use the bug report command if the issue persists.",
							flags: ["Ephemeral"],
						});

						return null;
					}
				})

				if (!response?.data?.idList) {
					span.setAttribute("command.status", "failed");
					span.setAttribute("command.status_reason", "invalid_trello_response");

					return interaction.reply({
						content: "Unable to fetch Trello card data.\nPlease use the bug report command if the issue persists.",
						flags: ["Ephemeral"],
					});
				}

				const District: string = GetDistrictFromID(response.data.idList)
				span.setAttribute("property.district", District);

				if (!District) {
					span.setAttribute("command.status", "failed");
					span.setAttribute("command.status_reason", "district_not_found");

					return interaction.reply({
						content: "Unable to find district.\nPlease use the bug report command if the issue persists.",
						flags: ["Ephemeral"],
					});
				}

				const DistrictManagers = await Sentry.startSpan(
					{ name: "Get District Managers", op: "db.prisma" },
					async (childSpan) => {
						try {
							const managers = await GetManagersFromDistrict(District);
							childSpan.setStatus({ code: 1 });
							return managers;
						} catch (error) {
							span.setAttribute("command.status", "failed");
							span.setStatus({ code: 2, message: "district_managers_fetch_failed" });
							Sentry.captureException(error);

							await interaction.reply({
								content: "Unable to find district manager.\nPlease use the bug report command if the issue persists.",
								flags: ["Ephemeral"],
							});

							return null;
						}
					}
				);

				span.setAttribute("district.managers.count", DistrictManagers.length);

				if (DistrictManagers.length == 0) {
					span.setAttribute("command.status", "failed");
					span.setAttribute("command.status_reason", "no_district_managers");

					return interaction.reply({
						content: "Unable to find district manager.\nPlease use the bug report command if the issue persists.",
						flags: ["Ephemeral"],
					});
				}

				let DistrictManager_DiscordOutput = ""

				for (let row in DistrictManagers) {
					DistrictManager_DiscordOutput += `<@${DistrictManagers[row].DiscordId}> `
				}

				span.setAttribute("district.managers.discords", DistrictManager_DiscordOutput);

				const DateS = new Date()

				const NewCard = await Sentry.startSpan({
					name: "Publish Trello Card",
					op: "property.publish_trello_card",
				}, async (childSpan) => {
					try {
						const publishedCard = await PublishCard(robloxName,
							"#Land Request\n\n" +
							"---\n\n" +
							`**Submitted at**: ${DateS.toUTCString()}\n` +
							`**Submitter**: ${robloxName}\n` +
							`**Property District**: ${District}\n` +
							`**Property Number**: ${propertiesBefore}\n\n` +
							"---\n\n" +
							`**Business Permit**: ${businessPermit}\n` +
							`**Business Group**: ${businessGroup}\n` +
							`**Requested Property**: ${requestedLand}\n\n` +
							"---\n\n" +
							`**Property Use**: ${propertyUse}`,
							Settings.LabelIds[District],
							DistrictManagers.map((manager) => manager.TrelloId) || null
						)

						childSpan.setStatus({ code: 1 });
						return publishedCard;
					}
					catch (error) {
						childSpan.setStatus({ code: 2, message: "trello_card_publish_failed" });

						span.setAttribute("command.status", "failed");
						span.setAttribute("command.status_reason", "trello_card_publish_failed");

						Sentry.captureException(error);

						await interaction.reply({
							content: "There was an error while processing your request.",
							flags: ["Ephemeral"],
						});

						return null;
					}
				});

				if (!NewCard) {
					return;
				}

				span.setAttribute("trello.new_card_id", NewCard.id);
				span.setAttribute("trello.new_card_url", NewCard.shortUrl);

				const newEmbed = new EmbedBuilder()
					.setAuthor({
						name: interaction.user.tag,
						iconURL:
							interaction.user.displayAvatarURL({ extension: "png", size: 512 }),
					})
					.setTitle("New Property Request Submission")
					.addFields(
						{ name: "Roblox Name", value: robloxName },
						{ name: "Property District", value: District },
						{ name: "Requested Land", value: requestedLand },
						{ name: "Trello Link", value: NewCard.shortUrl },
					)
					.setTimestamp()
					.setColor(global.embeds.embedColors.activity)
					.setFooter(global.embeds.embedFooter);

				const incomingRequestButton = new ButtonBuilder()
					.setLabel("Request")
					.setURL(NewCard.shortUrl)
					.setStyle(ButtonStyle.Link);

				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(incomingRequestButton);

				span.setAttribute("submission.channel_id", global.ChannelIDs.landSubmissions);

				const channel = await interaction.client.channels.fetch(global.ChannelIDs.landSubmissions) as TextChannel;
				if (!channel) {
					span.setStatus({ code: 2, message: "land_submissions_channel_not_found" });
					span.setAttribute("command.status", "failed");
					span.setAttribute("command.status_reason", "land_submissions_channel_not_found");

					return interaction.reply({
						content: "There was an error while processing your request, but it was uploaded to the Trello successfully.\nPlease use the bug report command to report this issue.",
						flags: ["Ephemeral"],
					});
				}

				await channel.send({ content: DistrictManager_DiscordOutput, embeds: [newEmbed], components: [row] });

				span.setAttribute("submission.channel_id", channel.id);
				span.setAttribute("command.status", "success");

				await interaction.reply({
					content: "Your submission was received successfully!",
					flags: ["Ephemeral"],
				});

				span.setStatus({ code: 1 });
				span.end();
			}
			catch (error) {
				span.setAttribute("command.status", "error");
				span.setStatus({ code: 2, message: "unhandled_exception" });
				Sentry.captureException(error);

				return interaction.reply({
					content: "There was an error while processing your request.",
					flags: ["Ephemeral"],
				});
			}
		});
	}
}
