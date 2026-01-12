import {
    InteractionHandler,
    InteractionHandlerTypes,
} from "@sapphire/framework";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Channel,
    EmbedBuilder,
    TextChannel,
    type ModalSubmitInteraction,
} from "discord.js";
import "dotenv";
require("dotenv").config();

import { ApplyOptions } from "@sapphire/decorators";

const UPLOAD_CHANNEL = global.ChannelIDs.devSupportTickets;

function SpliceUsername(username: string) {
    const spliced = username.split(" ")
    return spliced[spliced.length - 1]
}

@ApplyOptions({
    name: "property-request-modal",
})
export class ModalHandler extends InteractionHandler {
    public constructor(
        ctx: InteractionHandler.LoaderContext,
        options: InteractionHandler.Options
    ) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
        });
    }

    public override parse(interaction: ModalSubmitInteraction) {
        if (interaction.customId !== this.name) return this.none();

        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        const landPermit: string = interaction.fields.getTextInputValue("landPermit");
        const propertyIntentions: string = interaction.fields.getTextInputValue("propertyIntentions");
        const furtherInformation: string = interaction.fields.getTextInputValue("furtherInformation");

        const rbxUsername: string = SpliceUsername(interaction.user.displayName);

        const embed = new EmbedBuilder()
            .setTitle("New Property Request")
            .setColor(global.embeds.embedColors.mgmt)
            .addFields(
                { name: "Submitted By", value: rbxUsername },
                { name: "Land Permit", value: landPermit },
                { name: "Property Intentions", value: propertyIntentions },
                { name: "Further Information", value: furtherInformation || "N/A" },
            )
            .setFooter(global.embeds.embedFooter)
            .setTimestamp();

        const approveButton = new ButtonBuilder()
            .setCustomId("approve-property-request")
            .setLabel("Approve")
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId("decline-property-request")
            .setLabel("Decline")
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            approveButton,
            declineButton
        );

        const channel: Channel | undefined = interaction.client.channels.cache.get(UPLOAD_CHANNEL);

        if (!channel || !(channel instanceof TextChannel)) {
            return interaction.reply({
                content: `There was an error with your request. Please use the bug report command if this issue persists.\nError: NO_CHANNEL_FOUND`,
                flags: ["Ephemeral"],
            });
        }

        await channel.send({
            content: `New property request by: ${interaction.user.toString()}`,
            embeds: [embed],
            components: [actionRow],
        });

        return interaction.reply({
            content: `Your request was received successfully and is being reviewed by the Firestone Research and Development Team.`,
            flags: ["Ephemeral"],
        });
    }
}
