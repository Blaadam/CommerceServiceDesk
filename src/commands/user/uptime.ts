import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

function formatUptime(seconds: number): string {
    const SECONDS_IN_MINUTE = 60;
    const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * 60;
    const SECONDS_IN_DAY = SECONDS_IN_HOUR * 24;
    const SECONDS_IN_WEEK = SECONDS_IN_DAY * 7;

    let value;
    let unit;

    if (seconds >= SECONDS_IN_WEEK) {
        value = seconds / SECONDS_IN_WEEK;
        unit = "week";
    } else if (seconds >= SECONDS_IN_DAY) {
        value = seconds / SECONDS_IN_DAY;
        unit = "day";
    } else if (seconds >= SECONDS_IN_HOUR) {
        value = seconds / SECONDS_IN_HOUR;
        unit = "hour";
    } else if (seconds >= SECONDS_IN_MINUTE) {
        value = seconds / SECONDS_IN_MINUTE;
        unit = "minute";
    } else {
        value = seconds;
        unit = "second";
    }

    const roundedValue = Math.round(value);
    const pluralSuffix = roundedValue !== 1 ? "s" : "";

    return `${roundedValue} ${unit}${pluralSuffix}`;
}

@ApplyOptions<Command.Options>({
    name: "uptime",
    description: "Displays the length of time the bot has been active for.",
    cooldownDelay: 1_000,
})
export default class UptimeCommand extends Command {
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
        const uptimeInSeconds: number = process.uptime();
        const formattedUptime: string = formatUptime(uptimeInSeconds);

        const responseEmbed = new EmbedBuilder()
            .setAuthor({
                name: interaction.user.tag,
                iconURL:
                    interaction.user.displayAvatarURL({ extension: "png", size: 512 }),
            })
            .setTitle("Service Uptime")
            .setDescription(`${formattedUptime}`)
            .setTimestamp()
            .setColor(global.embeds.embedColors.default)
            .setFooter(global.embeds.embedFooter);

        return interaction.reply({ embeds: [responseEmbed], flags: ["Ephemeral"] });
    }
}