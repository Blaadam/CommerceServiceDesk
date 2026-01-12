import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	PermissionFlagsBits,
	User,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

import { databaseConnection } from "../../database";
import { SentryHelper } from "../../shared/sentry-utils";
import Sentry from "@sentry/node";
const connection = new databaseConnection();

async function RemoveManagerFromDistrict(
	managerId: bigint,
	district: string
) {
	const table = connection.prisma.managerTable;

	const existingManager = await table.findFirst({
		where: { DiscordId: managerId, District: district },
	});

	if (!existingManager) {
		return `Manager <@${managerId}> is not assigned to district ${district}.`;
	}

	await table.delete({ where: { Id: existingManager.Id } });
	return `Manager <@${managerId}> has been successfully removed from district ${district}.`;
}

@ApplyOptions<Command.Options>({
	name: "remove-manager",
	description: "Remove a manager from a district",
	cooldownDelay: 5_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)

				.addUserOption(option =>
					option
						.setName('manager')
						.setDescription('The member you would like to assign as a manager')
						.setRequired(true))

				.addStringOption(option =>
					option
						.setName('district')
						.setDescription('The district you want to view the managers for')
						.setRequired(true)
						.addChoices(
							{ name: 'Redwood', value: 'Redwood' },
							{ name: 'Arborfield', value: 'Arborfield' },
							{ name: 'Prominence', value: 'Prominence' },
							{ name: 'Unincorporated Areas', value: 'Unincorporated' }
						)
				)

				.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"], });

		const manager: User = interaction.options.getUser("manager", true)
		const district: string = interaction.options.getString("district", true)

		return SentryHelper.tracer(interaction, {
			name: "Remove Manager Command",
			op: "command.removeManager",
		}, async (span: any) => {
			try {
				span.setAttribute("manager.id", manager.id);
				span.setAttribute("district", district);

				const response: string | undefined = await Sentry.startSpan({
					name: "Remove District Manager",
					op: "db.prisma",
				}, async (childSpan) => {
					try {
						const res = await RemoveManagerFromDistrict(
							BigInt(manager.id),
							district
						);
						childSpan.setAttribute("result.message", res);
						childSpan.setStatus({ code: 1 });
						return res;
					}
					catch (error) {
						childSpan.setStatus({ code: 2, message: "internal_error" });

						span.setStatus({ code: 2, message: "internal_error" });
						span.setAttribute("error.message", error.message);
						Sentry.captureException(error);

						return null;
					}
				});

				if (response === null) {
					return await interaction.editReply({
						content: "An unexpected error occurred while processing your request.",
					});
				}

				return await interaction.editReply({
					content: response,
				});

			}
			catch (error) {
				span.setStatus({ code: 2, message: "internal_error" });
				span.setAttribute("error.message", (error as Error).message);

				Sentry.captureException(error);
				throw error;
			}
		});
	}
}
