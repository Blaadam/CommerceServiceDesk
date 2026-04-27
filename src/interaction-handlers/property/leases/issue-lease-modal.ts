import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	Channel,
	ContainerBuilder,
	DMChannel,
	ModalSubmitInteraction,
	Role,
	TextChannel,
	TextDisplayBuilder,
	User,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import Sentry from "@sentry/node";
import { getNextDeadline } from "../../../shared/property-deadlines";

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const ADDON = `&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

type CardInfo = {
	id: string;
	url: string;
	name: string;
	desc: string;
};

// url should come in as https://trello.com/c/xxxxxx/xx-lease-name
// fetch from the api which is https://api.trello.com/1/cards/xxxxxx?fields=desc&key=xxx&token=xxx
async function fetchLeaseLink(url: string): Promise<CardInfo | null> {
	//use regex
	const regex = /https:\/\/trello\.com\/c\/([a-zA-Z0-9]+)\/?.*/;
	const match = url.match(regex);
	if (!match || match.length < 2) {
		return null;
	}

	const cardId = match[1];
	const apiUrl = `https://api.trello.com/1/cards/${cardId}?fields=name,desc,url${ADDON}`;

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) {
			return null;
		}
		const data: CardInfo = await response.json();
		return data;
	} catch (error) {
		Sentry.captureException(error);
		return null;
	}
}

@ApplyOptions({
	name: "issue-lease-modal",
})
export class ModalHandler extends InteractionHandler {
	public constructor(
		ctx: InteractionHandler.LoaderContext,
		options: InteractionHandler.Options,
	) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
		});
	}

	public override parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId === this.name) {
			return this.some();
		}

		return this.none();
	}

	public async run(interaction: ModalSubmitInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		const receivingMembers =
			interaction.fields.getSelectedUsers("userSelect");

		if (!receivingMembers || receivingMembers.size === 0) {
			return interaction.editReply({
				content: "No receiving members selected.",
			});
		}

		const businessName =
			interaction.fields.getTextInputValue("businessName");

		if (!businessName) {
			return interaction.editReply({
				content: "Business name is required.",
			});
		}

		const leaseLink: string | null =
			interaction.fields.getTextInputValue("leaseLink");

		if (!leaseLink) {
			return interaction.editReply({
				content: "Lease link is required.",
			});
		}

		const cardInfo = await fetchLeaseLink(leaseLink);

		if (!cardInfo) {
			return interaction.editReply({
				content: "Invalid lease link provided.",
			});
		}

		const successUsers: User[] = [];

		const nextDeadline = getNextDeadline(new Date());

		const deadlineTimestamp = new Date(
			nextDeadline.year,
			nextDeadline.month,
			nextDeadline.day,
			0,
			0,
			0,
		).getTime();

		for (const [_, member] of receivingMembers) {
			const dmChannel: DMChannel = await member.createDM();
			if (!dmChannel) {
				continue;
			}

			const issueContainer = new ContainerBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`
# <:blm:1086413574131421226><:commerce:1177850456114991186> || Business Land Lease Issued

Dear ${member},

Congratulations! Your land request has been accepted by the Firestone Bureau of Land Management. Your Property Card can be found [here](${cardInfo.url}).

We appreciate your cooperation throughout the land request process, and we look forward to seeing how you utilize and steward this land. As part of the approval process, we kindly remind you that upon approval, your business has a responsibility to submit an activity report within two months.

**Your Next Property Activity Due Date Is <t:${Math.floor(deadlineTimestamp / 1000)}:F>.**

Should you have any further inquiries or require assistance, please do not hesitate to reach out to the sender.

Sincerely,

${interaction.user}
Firestone Bureau of Land Management`),
				)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`
-# CSD is ran and developed by Nøyra Oy - https://discord.gg/5SdTjEKCdM
-# Please make a ticket in our official discord server for any enquires.`),
				);

			try {
				await dmChannel.send({
					components: [issueContainer],
					flags: ["IsComponentsV2"],
				});
				successUsers.push(member);
			} catch (error) {
				Sentry.captureException(error);
				continue;
			}
		}

		const blmChannel: Channel | undefined =
			interaction.client.channels.cache.get(
				global.ChannelIDs.blmRevokeLand,
			);
		if (!blmChannel || !(blmChannel instanceof TextChannel)) {
			return interaction.editReply({
				content: "BLM Channel not found or is not text based.",
			});
		}

		const landManagementRole: Role | undefined =
			interaction.guild?.roles.cache.find(
				(role) => role.name === "Bureau of Land Management Leadership",
			);
		if (!landManagementRole) {
			return interaction.editReply({
				content:
					"`Bureau of Land Management Leadership` Role not found.",
			});
		}

		Sentry.metrics.count("blm.leases.revoked", 1, {
			attributes: {
				"inspector.id": interaction.user.id,
				"inspector.tag": interaction.user.tag,
				"business.name": businessName,
			},
		});

		return interaction.editReply({
			content: `Lease revocation notices sent to ${successUsers.map((user) => user.tag).join(", ")} successfully!`,
		});
	}
}
