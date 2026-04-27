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
	name: "revoke-lease-modal",
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

		const reasons = interaction.fields.getTextInputValue("revokeReason");

		if (!reasons) {
			return interaction.editReply({
				content: "At least one reason is required.",
			});
		}

		const cardInfo = await fetchLeaseLink(leaseLink);

		if (!cardInfo) {
			return interaction.editReply({
				content: "Invalid lease link provided.",
			});
		}

		const successUsers: User[] = [];

		for (const [_, member] of receivingMembers) {
			const dmChannel: DMChannel = await member.createDM();
			if (!dmChannel) {
				continue;
			}

			const revokeContainer = new ContainerBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`
# <:blm:1086413574131421226><:commerce:1177850456114991186> || Business Land Lease Revocation

Dear ${member},

This letter serves as an official notice from the Firestone Bureau of Land Management (BLM) regarding the expiry of your land lease agreement. We regret to inform you that your lease on [${cardInfo.name}](${cardInfo.url}) has expired.

The reason for this revocation / expiry of land is for the following reasons listed below:
                        
- ${reasons.split("\n").join("\n- ")}

If you believe there has been a misunderstanding or wish to discuss the matter further, please contact the sender. We encourage open communication to explore potential resolutions or clarify any outstanding concerns.

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
					components: [revokeContainer],
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
