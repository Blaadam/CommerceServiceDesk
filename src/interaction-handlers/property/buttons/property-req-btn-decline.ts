import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';
import { databaseConnection } from '../../../database';

const db = new databaseConnection()

async function GetPropertyManagers(district: string) {
    return await db.prisma.managerTable.findMany({
        where: {
            District: district
        }
    });
}

@ApplyOptions({
	name: "property-req-btn-decline",
})
export class ButtonHandler extends InteractionHandler {
	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	public override parse(interaction: ButtonInteraction) {
        if (interaction.customId.startsWith(this.name)) return this.some();

		return this.none();
	}

	public async run(interaction: ButtonInteraction) {
        // await interaction.deferReply({ flags: ["Ephemeral"] });
        const CardID = interaction.customId.split("_")[1];

        if (!CardID) {
            await interaction.reply({ content: "Unable to locate the card ID for this request." });
            return;
        }

		const existingEmbed = interaction.message.embeds[0];
        if (!existingEmbed) {
            await interaction.reply({ content: "Unable to locate the original embed for this request." });
            return;
        }

        const districtManagers = await GetPropertyManagers(existingEmbed.fields[1].value);

        if (districtManagers.length === 0) {
            await interaction.reply({ content: "Unable to locate any property managers for this request's district." });
            return;
        }

        if (!districtManagers.some(manager => String(manager.DiscordId) === interaction.user.id)) {
            await interaction.reply({ content: "You are not a property manager for this request's district." });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`property-req-action_decline_${CardID}_${interaction.message.id}`)
            .setTitle("Property Request Decline");

        const declineNotesLabel = new LabelBuilder()
            .setLabel("Decline Notes")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("declineNotes")
                    .setPlaceholder("Default: N/A")
                    .setStyle(TextInputStyle.Paragraph)
            );

        modal.addLabelComponents(declineNotesLabel);

        await interaction.showModal(modal);		
	}
}