import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
    EmbedBuilder,
    TextChannel,
    type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils";

import Sentry from "@sentry/node";

const BACKLOG_PAGE_SIZE = 41;

@ApplyOptions<Command.Options>({
    name: "request-backlog",
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
        });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        return SentryHelper.tracer(interaction, {
            name: "Request Backlog Command",
            op: "command.requestBacklog",
        }, async (span: Sentry.Span) => {
            span.setAttribute("channel.id", global.ChannelIDs.devSupportTickets);

            const channel = interaction.client.channels.cache.get(global.ChannelIDs.devSupportTickets);
            if (!channel || !(channel instanceof TextChannel)) {
                span.setAttribute("command.status", "failed");
                span.setStatus({ code: 2, message: "internal_error" });
                span.setAttribute("error.reason", "ChannelNotFound");

                await interaction.editReply("The dev support tickets channel could not be found.");
                return;
            }

            const messages = await channel.messages.fetch({ limit: BACKLOG_PAGE_SIZE + 1 });
            if (!messages) {
                span.setAttribute("command.status", "failed");
                span.setStatus({ code: 2, message: "internal_error" });
                span.setAttribute("error.reason", "MessagesNotFound");

                await interaction.editReply("Could not fetch messages from the dev support tickets channel.");
                return;
            }

            console.log(`Fetched ${messages.size} messages from the dev support tickets channel.`);
            span.setAttribute("messages.fetched", messages.size);

            const backlog = messages.filter((message) => message.embeds.length > 0 && message.embeds[0].color === global.embeds.accentColors.mgmt);
            span.setAttribute("backlog.size", backlog.size);

            if (backlog.size === 0) {
                await interaction.editReply("The backlog is currently empty.");
                return;
            }

            const isFull = backlog.size > BACKLOG_PAGE_SIZE;
            span.setAttribute("backlog.isFull", isFull);

            var embeds: EmbedBuilder[] = [];
            for (const [, message] of backlog.entries()) {
                if (embeds.length >= 10) {
                    await interaction.followUp({ embeds });
                    embeds = [];
                }

                const embed = message.embeds[0];
                // const title = embed.title ?? "No Title";
                // const description = embed.description ?? "No Description";

                const newEmbed = EmbedBuilder.from(embed)
                embeds.push(newEmbed);
            }

            if (embeds.length > 0) {
                await interaction.followUp({ embeds });
            }

            await interaction.editReply({ content: `Here are the total ${backlog.size} requests in the backlog:` });
        });
    }
}
