import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import { type ChatInputCommandInteraction } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import Sentry from "@sentry/node";

@ApplyOptions<Command.Options>({
	name: "ping",
	description: "Check the bot's latency",
	cooldownDelay: 2_000,
})
export default class PingCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command.setName(this.name).setDescription(this.description);
		}, {
			guildIds: [],
		});
	}

	public chatInputRun(interaction: ChatInputCommandInteraction) {
		const ping = this.container.client.ws.ping;

		Sentry.metrics.distribution('command.ping.latency', ping);

		return interaction.reply({
			content: `Pong! \`${ping}ms\``,
			flags: ["Ephemeral"]
		});
	}
}
