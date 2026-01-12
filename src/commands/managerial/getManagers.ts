import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	EmbedBuilder,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

import { databaseConnection } from "../../database";
import * as Sentry from "@sentry/node";
import { SentryHelper } from "../../shared/sentry-utils.ts";
const connection = new databaseConnection();

async function GetManagersFromDistrict(district: string, span?: any): Promise<string[]> {
	const table = connection.prisma.managerTable
	const rows = await table.findMany({ where: { District: district } });

	span?.setAttribute("database.table", "managerTable");
	span?.setAttribute("database.query", `findMany where District = ${district}`);
	span?.setAttribute("database.result.count", rows.length);


	if (rows.length === 0) {
		return [`No managers found for district: ${district}`];
	}

	const managersList: string[] = rows.map((row) => {
		return `<@${row.DiscordId}> - ${row.TrelloId}`;
	});

	return managersList;
}

@ApplyOptions<Command.Options>({
	name: "get-managers",
	description: "Get the list of managers for a specific district",
	cooldownDelay: 1_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)
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
				);
		}, {
			guildIds: [],
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		Sentry.logger.info("Invoked get-managers command", {
			"user.id": interaction.user?.id,
			"channel.id": interaction.channelId,
			"guild.id": interaction.guildId,
		});

		await interaction.deferReply({ flags: ["Ephemeral"], });
		Sentry.logger.info("Deferred reply (ephemeral)");

		const district: string = interaction.options.getString("district", true);
		Sentry.logger.info("District option parsed", { district });

		return SentryHelper.tracer(interaction, {
			name: "Get Managers Command",
			op: "command.getManagers",
		}, async (span: any) => {
			span.setAttribute("district.name", district);

			const managers: string[] | null = await Sentry.startSpan({
				name: "Fetch Managers from Database",
				op: "db.prisma.getManagers",
			}, async (childSpan) => {
				Sentry.logger.info("Fetching managers from database", { district });

				try {
					const districtManagers: string[] = await GetManagersFromDistrict(district, span);

					childSpan.setStatus({ code: 1 });
					Sentry.logger.info("Fetched managers from DB", { district, count: Array.isArray(districtManagers) ? districtManagers.length : 0 });

					return districtManagers;
				}
				catch (error) {
					childSpan.setStatus({ code: 2, message: "internal_error" });
					span.setStatus({ code: 2, message: "internal_error" });
					span.setAttribute("error.message", (error as Error).message);
					Sentry.captureException(error);

					await interaction.editReply({
						content: "An error occurred while fetching the managers for the specified district.",
					});

					return null
				}
			});

			if (managers === null) {
				span.setAttribute("command.status", "failed_database_fetch");
				Sentry.logger.info("Command failed: database fetch returned null", { district });
				return;
			}

			span.setAttribute("district.managers.list", managers.join(", "));
			span.setAttribute("district.managers.count", managers.length);

			const newEmbed = new EmbedBuilder()
				.setColor(global.embeds.embedColors.mgmt)
				.setTitle(`${district} Managers`)
				.setTimestamp()
				.setFooter(global.embeds.embedFooter)
				.setDescription(managers.join("\n"));

			span.setAttribute("command.status", "success");

			return await interaction.editReply({
				embeds: [newEmbed]
			});
		});
	}
}
