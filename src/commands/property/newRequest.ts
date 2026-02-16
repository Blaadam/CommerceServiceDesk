import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { blm_property_request_modal } from "../../shared/cross-modals";

@ApplyOptions<Command.Options>({
	name: "new-request",
	description: "Create a new property request",
	cooldownDelay: 2_500,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		return await blm_property_request_modal(interaction);
	}
}
