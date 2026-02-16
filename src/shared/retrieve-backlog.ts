import { TextChannel, Collection, Message, Client } from "discord.js";
import { Span } from "@opentelemetry/api";

const BACKLOG_PAGE_SIZE = 10;

export async function retrieveBacklog(
    client: Client,
    span?: Span
): Promise<Collection<string, Message>> {
    const channel = client.channels.cache.get(
        global.ChannelIDs.devSupportTickets
    );

    var backlog = new Collection<string, Message>();

    if (!channel || !(channel instanceof TextChannel)) {
        span?.setAttribute("command.status", "failed");
        span?.setStatus({ code: 2, message: "internal_error" });
        span?.setAttribute("error.reason", "ChannelNotFound");
        return backlog;
    }

    const messages = await channel.messages.fetch({
        limit: BACKLOG_PAGE_SIZE + 1,
    });
    if (!messages) {
        span?.setAttribute("command.status", "failed");
        span?.setStatus({ code: 2, message: "internal_error" });
        span?.setAttribute("error.reason", "MessagesNotFound");
        return backlog;
    }

    console.log(
        `Fetched ${messages.size} messages from the dev support tickets channel.`
    );
    span?.setAttribute("messages.fetched", messages.size);

    backlog = messages.filter(
        (message) =>
            message.embeds.length > 0 &&
            message.embeds[0].color === global.embeds.accentColors.mgmt
    );
    span?.setAttribute("backlog.size", backlog.size);

    const isFull = backlog.size > BACKLOG_PAGE_SIZE;
    span?.setAttribute("backlog.isFull", isFull);

    const sorted = backlog
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    
    return sorted;
}
