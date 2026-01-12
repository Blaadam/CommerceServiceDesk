import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';

@ApplyOptions({
	name: "activity-button",
})
export class ButtonHandler extends InteractionHandler {
	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== this.name) return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		const modal = new ModalBuilder()
			.setCustomId("activity-modal")
			.setTitle("Activity Submission");

		const businessNameLabel = new LabelBuilder()
			.setLabel("Business")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("businessName")
					.setPlaceholder("Spectra Pipeline Management")
					.setStyle(TextInputStyle.Short)
			);

		const propertyDistrictLabel = new LabelBuilder()
			.setLabel("Property District")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("propertyDistrict")
					.setPlaceholder("Redwood, Prominence, Unincorporated & Prominence\nALT: Farms, Hillview, Greendale")
					.setStyle(TextInputStyle.Short)
			);

		const propertyActivityLabel = new LabelBuilder()
			.setLabel("Property Activity Evidence")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("propertyActivity")
					.setPlaceholder("[LINK]")
					.setStyle(TextInputStyle.Paragraph)
			);

		const additionalInformationLabel = new LabelBuilder()
			.setLabel("Additional Information")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("additionalInformation")
					.setPlaceholder("Default: N/A")
					.setStyle(TextInputStyle.Paragraph)
			);

		modal.addLabelComponents(
			businessNameLabel,
			propertyDistrictLabel,
			propertyActivityLabel,
			additionalInformationLabel
		);

		return await interaction.showModal(modal);
	}
}