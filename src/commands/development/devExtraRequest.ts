import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import { type ChatInputCommandInteraction } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { dev_request_extra_modal } from "../../shared/cross-modals";

@ApplyOptions<Command.Options>({
	name: "dev-request-extra",
	description: "Submit an extra request for review. Files can be attached.",
	cooldownDelay: 5_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand((command) => {
			command.setName(this.name).setDescription(this.description);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		return await dev_request_extra_modal(interaction);
	}
}
