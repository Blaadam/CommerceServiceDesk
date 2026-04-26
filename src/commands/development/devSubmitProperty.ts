import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import { type ChatInputCommandInteraction } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { dev_submit_property_modal } from "../../shared/cross-modals";

@ApplyOptions<Command.Options>({
	name: "dev-submit-property",
	description: "Submit a property file for review.",
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
		return await dev_submit_property_modal(interaction);
	}
}
