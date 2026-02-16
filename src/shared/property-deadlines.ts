import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, ContainerBuilder, TextChannel } from "discord.js";
import { promises } from "fs"

const NOTICE_TITLE = "Notice of Deadline for Activity Reports";
const NOTICE_DESCRIPTION = `
Attention Land Owners

We want to inform you that the deadline for submitting your activity reports is quickly approaching. To ensure compliance, we kindly request all landowners to submit their activity reports by **FORMAT_SUBMISSION_DATE**.
Your prompt cooperation will greatly assist us in maintaining accurate records and making informed decisions.

Please click the green button or use the /newactivity command to submit notice of activity

Thank you for your attention to this matter. We greatly appreciate your cooperation in helping us effectively manage our land resources.

Sincerely,
Firestone Bureau of Land Management

<@&${global.RoleIDs.docm_lm_notif_opt}>

-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM
-# Please make a ticket in our official discord server for any enquires.
`

type DateObject = {
    day: number;
    month: number;
    year: number;
}

const DEADLINE_DAY_OFFSET = 7;
const MINIMUM_CHECK_THRESHHOLD_DAYS = 2;
const DEADLINE_CHECK_FILE = '/app/data/blm_deadline.json';

function padToTwoDigits(num: number): string {
    return num.toString().padStart(2, '0');
}

// function getNextDeadline(currentDate: Date): DateObject {
//     // Setting day to 0 of the NEXT month gives the LAST day of the CURRENT month.
//     // Example: Feb 2026, 0 -> Feb 28, 2026
//     const deadlineDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, DEADLINE_DAY_OFFSET);

//     return {
//         day: deadlineDay.getDate(),
//         month: deadlineDay.getMonth(),
//         year: deadlineDay.getFullYear(),
//     };
// }

function getNextDeadline(currentDate: Date): DateObject {
    // 1. Get the initial target date (e.g., the last day of the month)
    const deadlineDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, DEADLINE_DAY_OFFSET);

    // 2. Calculate how many days to move to hit the previous Saturday
    // .getDay() returns 0 (Sun) to 6 (Sat)
    const currentDayOfWeek = deadlineDay.getDay();

    // If it's already Saturday (6), adjustment is 0. 
    // If it's Sunday (0), we go back 1 day.
    // If it's Friday (5), we go back 6 days to hit the previous Saturday.
    const daysToSubtract = (currentDayOfWeek + 1) % 7;

    deadlineDay.setDate(deadlineDay.getDate() - daysToSubtract);

    return {
        day: deadlineDay.getDate(),
        month: deadlineDay.getMonth(),
        year: deadlineDay.getFullYear(),
    };
}

function setFileTimestamp(currentDate: Date) {
    const data = {
        timestamp: currentDate.toISOString(),
    };

    return promises.writeFile(DEADLINE_CHECK_FILE, JSON.stringify(data), 'utf-8');
}

function getNoticeDate(deadline: DateObject): DateObject {
    // Create a date object from the deadline
    const date = new Date(deadline.year, deadline.month, deadline.day);

    // Move the date back by the offset * 2, should be 2 weeks before the deadline
    date.setDate(date.getDate() - DEADLINE_DAY_OFFSET * 2);

    return {
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
    };
}

export async function create_deadline_announcement(client: Client) {
    const currentDate = new Date();
    const nextDeadline = getNextDeadline(new Date());

    const NoticeDesc = NOTICE_DESCRIPTION.trim()
        .replace("FORMAT_SUBMISSION_DATE", `${nextDeadline.year}-${padToTwoDigits(nextDeadline.month + 1)}-${padToTwoDigits(nextDeadline.day)}`)

    const noticeContainer = new ContainerBuilder()
        .setAccentColor(global.embeds.accentColors.blm)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `## ${NOTICE_TITLE}`
            ),
        )
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                NoticeDesc
            ),
        );

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel("Submit Notice of Activity")
                .setStyle(ButtonStyle.Success)
                .setCustomId("modal-blm_property_activity_modal"))
        .addComponents(
            new ButtonBuilder()
                .setLabel("Land Management Database")
                .setStyle(ButtonStyle.Link)
                .setURL("https://trello.com/b/v2fxXXhn/land-management-database"))
        .addComponents(
            new ButtonBuilder()
                .setLabel("Contact Support")
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.gg/5SdTjEKCdM"));

    noticeContainer.addActionRowComponents(buttons);

    noticeContainer.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
            `-# Last updated <t:${Math.floor(Date.now() / 1000)}:F>`
        )
    );

    const channel = await client.channels.fetch(global.ChannelIDs.deadlineAnnouncements);
    if (!(channel instanceof TextChannel)) {
        console.warn("Channel is not a TextChannel");
        return;
    }

    await channel.send({ components: [noticeContainer], flags: ["IsComponentsV2"] });

    try {
        await setFileTimestamp(currentDate);
    }
    catch (error) {
        console.error("Error sending announcement:", error);
    }
}

export async function checkIsReadyForDeadlineAnnouncement() {
    const currentDate = new Date();
    const nextDeadline = getNextDeadline(currentDate);
    const noticeDate = getNoticeDate(nextDeadline);

    // triggers exactly on the deadline date
    if (currentDate.getFullYear() != noticeDate.year ||
        currentDate.getMonth() != noticeDate.month ||
        currentDate.getDate() != noticeDate.day) {
        return false;
    }

    // triggers at mid-day or thereafter, when americans are awake.
    if (currentDate.getHours() < 12) {
        return false;
    }

    // check to make sure its not been announced already. threshold of 2 days to prevent same-day posting
    try {
        const data = await promises.readFile(DEADLINE_CHECK_FILE, 'utf-8');
        const { timestamp } = JSON.parse(data);
        const lastCheckDate = new Date(timestamp);
        const daysSinceLastCheck = (currentDate.getTime() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastCheck < MINIMUM_CHECK_THRESHHOLD_DAYS) {
            return false;
        }
    } catch (error) {
        console.log("No previous check found or error reading file, proceeding with check.");
        console.warn(error)
    }

    return true;
}
