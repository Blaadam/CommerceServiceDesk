import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	PermissionFlagsBits,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { databaseConnection } from "../../database";
import { SentryHelper } from "../../shared/sentry-utils";
import Sentry from "@sentry/node";

const connection = new databaseConnection();

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const ADDON = `?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

async function AddManagerToDistrict(
	managerId: bigint,
	district: string,
	trelloId: string,
) {
	const table = connection.prisma.managerTable;

	// Check if the manager already exists in the district
	const existingManager = await table.findFirst({
		where: { DiscordId: managerId, District: district },
	});

	if (existingManager) {
		return `Manager <@${managerId}> is already assigned to district ${district}.`;
	}

	// Add the new manager to the district
	await table.create({
		data: {
			DiscordId: managerId,
			District: district,
			TrelloId: trelloId,
			AssignedAt: new Date(),
		},
	});

	return `Manager <@${managerId}> has been successfully added to district ${district} with Trello ID ${trelloId}.`;
}

@ApplyOptions<Command.Options>({
	name: "new-manager",
	description: "Add a new manager to a district",
	cooldownDelay: 5_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)

				.addUserOption((option) =>
					option
						.setName("manager")
						.setDescription(
							"The member you would like to assign as a manager",
						)
						.setRequired(true),
				)

				.addStringOption((option) =>
					option
						.setName("district")
						.setDescription(
							"The district you want to view the managers for",
						)
						.setRequired(true)
						.addChoices(
							{ name: "Redwood", value: "Redwood" },
							{ name: "Arborfield", value: "Arborfield" },
							{ name: "Prominence", value: "Prominence" },
							{
								name: "Unincorporated Areas",
								value: "Unincorporated",
							},
						),
				)

				.addStringOption((option) =>
					option
						.setName("trelloname")
						.setDescription(
							"Their Trello Name (found in their trello profile url)",
						)
						.setRequired(true),
				)

				.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		return SentryHelper.tracer(
			interaction,
			{
				name: "New Manager Command",
				op: "command.newManager",
			},
			async (span) => {
				const manager = interaction.options.getUser("manager", true);
				const district = interaction.options.getString(
					"district",
					true,
				);
				const trelloName = interaction.options.getString(
					"trelloname",
					true,
				);

				span.setAttribute("manager.id", manager.id);
				span.setAttribute("district", district);
				span.setAttribute("manager.trelloName", trelloName);

				const trelloMemberIdResult: string | null =
					await Sentry.startSpan(
						{
							name: "Fetch Trello Member ID",
							op: "trello.api.members.fetch",
						},
						async (childSpan) => {
							try {
								const url = `https://api.trello.com/1/members/${trelloName}`;
								childSpan.setAttribute("trello.url", url);
								const response = await fetch(url + ADDON, {
									method: "GET",
									headers: {
										"Content-Type": "application/json",
									},
								});

								if (!response.ok) {
									throw new Error(
										`Trello API responded with status ${response.status}: ${response.statusText}`,
									);
								}

								const data = await response.json();
								const trelloMemberId = data.id;

								childSpan.setAttribute(
									"trello.memberId",
									trelloMemberId,
								);
								childSpan.setStatus({ code: 1 }); // OK

								return trelloMemberId;
							} catch (error) {
								childSpan.setStatus({
									code: 2,
									message: "trello_api_error",
								});
								childSpan.setAttribute(
									"error.message",
									(error as Error).message,
								);
								Sentry.captureException(error);

								return null;
							}
						},
					);

				if (trelloMemberIdResult === null) {
					return interaction.editReply({
						content:
							"Failed to fetch Trello member information. Please check the Trello ID and try again.",
					});
				}

				span.setAttribute("manager.trelloId", trelloMemberIdResult);

				const response: string | null = await Sentry.startSpan(
					{
						name: "Add District Manager",
						op: "db.prisma",
					},
					async (childSpan) => {
						try {
							const result: string = await AddManagerToDistrict(
								BigInt(manager.id),
								district,
								trelloMemberIdResult,
							);

							span.setAttribute("result.message", result);
							span.setStatus({ code: 1 }); // OK
							return result;
						} catch (error) {
							childSpan.setStatus({
								code: 2,
								message: "internal_error",
							});
							span.setStatus({
								code: 2,
								message: "internal_error",
							});
							span.setAttribute(
								"error.message",
								(error as Error).message,
							);
							Sentry.captureException(error);

							return null;
						}
					},
				);

				if (response === null) {
					return interaction.editReply({
						content:
							"An unexpected error occurred while processing your request.",
					});
				}

				return interaction.editReply({ content: response });
			},
		);
	}
}
