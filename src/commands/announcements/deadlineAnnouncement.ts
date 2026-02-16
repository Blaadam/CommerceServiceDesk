import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	PermissionFlagsBits,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { create_deadline_announcement } from "../../shared/property-deadlines";

@ApplyOptions<Command.Options>({
	name: "blm-activity-deadline",
	description: "Create a deadline announcement for Activity Submissions",
	cooldownDelay: 10_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		await create_deadline_announcement(interaction.client)

		return await interaction.editReply({
			content: "Deadline announcement created successfully."
		});
	}
}
