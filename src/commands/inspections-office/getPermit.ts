import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	PermissionFlagsBits,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils.js";

@ApplyOptions<Command.Options>({
	name: "retrieve-permit",
	description: "Retrieves a permit for the provided business name",
	cooldownDelay: 5_000,
})
export default class RetrievePermitCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)
				.addStringOption(option =>
					option.setName('permit')
						.setDescription('The business name of the permit to retrieve')
						.setRequired(true)
						.setAutocomplete(true))
				.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		return SentryHelper.tracer(interaction, {
			name: "Retrieve Permit Command",
			op: "command.retrievePermit",
		}, async (span: any) => {
			const permitLink: string = interaction.options.getString('permit');
			return interaction.editReply(`Here is the permit you requested: ${permitLink}`);
		});
	}
}
