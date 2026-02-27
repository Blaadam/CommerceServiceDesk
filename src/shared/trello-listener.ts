import Sentry from "@sentry/node";
import { ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonStyle, Client, ContainerBuilder } from "discord.js";
import { promises } from "fs";

const BLM_TRELLO_BOARD_ID = "v2fxXXhn";
const AWAITING_APPROVAL_LIST_ID = "642e6160c9c885fea1ce3569";
const CHANNEL_ID_TO_MESSAGE = "1433519872209322196";

const BLM_PENDING_REQUESTS_FILE = '/app/data/blm_pending_requests.json';

type FileStructure = {
    pendingRequests: string[];
    timestamp: string;
}

type Card = {
    id: string;
    name: string;
}

const NOTICE_TITLE = "Pending Property Requests Backlog";
const NOTICE_DESCRIPTION = `
Dear <@&${global.RoleIDs.blmLeadership}>,

This is an update regarding the current backlog of pending property requests on the Land Management board. We have identified **FORMAT_NUMBER_OF_REQUESTS** pending requests that require your attention.

To review and manage these requests, please visit the following Trello board:
> https://trello.com/b/${BLM_TRELLO_BOARD_ID}

Your prompt attention to these pending requests is crucial in ensuring efficient processing and resolution. If you have any questions or need assistance, please don't hesitate to reach out.

Thank you for your dedication and support in managing our land resources effectively.

Best regards,
Commerce Service Desk
-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM
-# Please make a ticket in our official discord server for any enquires.
`

const EXCLUSIONARY_CARD_TITLES = [
    "The Commissioner shall sign off on all land requests before being issued to a business. Once approved, please complete the appropriate paperwork then archive the request card. If the request is denied, the Commissioner will archive the card.",
    "---",
]

const ACTION_BUTTONS: ButtonBuilder[] = [
    new ButtonBuilder()
        .setLabel("View Trello Board")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://trello.com/b/${BLM_TRELLO_BOARD_ID}`),
    new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com/invite/5SdTjEKCdM"),
]

async function getFileData() {
    try {
        const data = await promises.readFile(BLM_PENDING_REQUESTS_FILE, 'utf-8');
        const parsedData: FileStructure = JSON.parse(data);
        return parsedData;
    } catch (error) {
        console.log("No previous check found or error reading file, proceeding with check.");
        console.warn(error)
        return { pendingRequests: [], timestamp: 0 };
    }
}

async function setFileData(pendingRequests: string[]) {
    const dataToWrite: FileStructure = {
        pendingRequests,
        timestamp: new Date().toISOString()
    };

    await promises.writeFile(BLM_PENDING_REQUESTS_FILE, JSON.stringify(dataToWrite));
}

export async function check_blm_trello_for_updates(client: Client) {
    return await Sentry.startSpan({
        name: "check_blm_trello_for_updates",
        op: "trello_check"
    }, async (span: Sentry.Span) => {
        const fileData = await getFileData();
        const pendingRequests: string[] = fileData?.pendingRequests || [];

        span.setAttribute("previous.pending.requests", pendingRequests?.join(",") || "none");
        span.setAttribute("previous.check.timestamp", fileData?.timestamp || "none");

        const listData = await fetch(`https://api.trello.com/1/lists/${AWAITING_APPROVAL_LIST_ID}/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`)
        if (!listData.ok) {
            span.setStatus({ code: 2, message: "Failed to fetch Trello data" });
            span.setAttribute("trello_fetch_error", listData.statusText);
            console.warn("Failed to fetch Trello data:", listData.statusText);

            return;
        }

        const cards: Card[] | null = await listData?.json();
        if (!cards) {
            span.setStatus({ code: 2, message: "No data received from Trello" });
            console.warn("No data received from Trello");
            return;
        }

        const newPendingRequests: string[] = cards.filter((card: Card) => !EXCLUSIONARY_CARD_TITLES.includes(card.name)).map((card: Card) => card.id);

        span.setAttribute("trello.pending.requests.list", newPendingRequests.join(","));

        const hasUpdates = newPendingRequests.some((id: string) => !pendingRequests?.includes(id));
        span.setAttribute("trello.pending.requests.has_updates", hasUpdates);

        if (!hasUpdates) {
            span.setStatus({ code: 1, message: "No new pending requests" });
            console.log("No new pending requests");
            return;
        }

        span.setAttribute("trello.pending.requests.count", newPendingRequests.length);

        const channel = await client.channels.fetch(CHANNEL_ID_TO_MESSAGE);
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
            span.setStatus({ code: 2, message: "Channel not found or not text-based" });
            console.warn("Channel not found or not text-based");
            return;
        }

        const updateContainer = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
                textDisplay
                    .setContent(NOTICE_DESCRIPTION.replace("FORMAT_NUMBER_OF_REQUESTS", `${newPendingRequests.length}`))
            )
            .addActionRowComponents((actionRow) =>
                actionRow.addComponents(
                    ACTION_BUTTONS
                )
            );

        await channel.send({ components: [updateContainer], flags: ["IsComponentsV2"] });
        await setFileData(newPendingRequests);

        span.setStatus({ code: 1, message: "Pending requests updated and message sent" });
    });
}