import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    Collection,
    EmbedBuilder,
    Message,
    type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils";

import Sentry from "@sentry/node";
import { retrieveBacklog } from "../../shared/retrieve-backlog";

const BACKLOG_PAGE_SIZE = 41;

@ApplyOptions<Command.Options>({
    name: "dev-request-backlog",
    description: "View the backlog of property requests.",
    cooldownDelay: 5_000,
})
export default class ViewHistoryCommand extends Command {
    public override registerApplicationCommands(
        registry: ApplicationCommandRegistry
    ) {
        registry.registerChatInputCommand((command) => {
            command
                .setName(this.name)
                .setDescription(this.description);
        }, { guildIds: [global.GuildIDs.supportServer] });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: ["Ephemeral"] });

        return SentryHelper.tracer(interaction, {
            name: "Request Dev Backlog Command",
            op: "command.requestDevBacklog",
        }, async (span: Sentry.Span) => {
            span.setAttribute("channel.id", global.ChannelIDs.devSupportTickets);

            const backlog: Collection<string, Message> = await retrieveBacklog(
                interaction.client,
                span,
            );

            if (!backlog || backlog.size === 0) {
                span.setAttribute("command.status", "failed");
                await interaction.editReply("The backlog is currently empty.");
                return;
            }

            span.setAttribute("backlog.size", backlog.size);
            const isFull = backlog.size > BACKLOG_PAGE_SIZE;
            span.setAttribute("backlog.isFull", isFull);

            var embeds: EmbedBuilder[] = [];
            for (const [, message] of backlog.entries()) {
                if (embeds.length >= 10) {
                    await interaction.followUp({ embeds, flags: ["Ephemeral"] });
                    embeds = [];
                }

                const embed = message.embeds[0];
                const newEmbed = EmbedBuilder.from(embed);
                embeds.push(newEmbed);
            }

            if (embeds.length > 0) {
                await interaction.followUp({ embeds, flags: ["Ephemeral"] });
            }

            await interaction.editReply({ content: `Here are the total ${backlog.size} requests in the backlog:` });
        });
    }
}
