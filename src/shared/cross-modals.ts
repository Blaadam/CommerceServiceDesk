/*

Module is to handle displaying modals across a range of interactions. Such as, being able to run /dev-request-property and being
able to click a button called "Request Property" and have the same modal pop up. This is to avoid having multiple modals
that do the same thing, and to avoid having to duplicate code.

*/

import { ButtonInteraction, CommandInteraction, FileUploadBuilder, LabelBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export async function dev_request_extra_modal(interaction: CommandInteraction | ButtonInteraction) {
    const DISCLAIMER = `
This form may be used as a request, or a submission for extra files related to a business such as tools, assets or vehicles.

If you are requesting a property, please use the **/dev-request-property** command. If you are submitting a property, please use the **/dev-submit-property** command.

Ensure the extra files are in .rbxm format. Your submission will be declined if it includes the wrong format.
`;

    const modal = new ModalBuilder()
        .setCustomId("dev-request-extra-modal")
        .setTitle("Extra Development Request");

    const businessLicenseLabel = new LabelBuilder()
        .setLabel("Business License")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("businessLicense")
                .setPlaceholder("[LINK TO BUSINESS LICENSE]")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

    const fileFormatTextDisplayLabel = new TextDisplayBuilder()
        .setContent(DISCLAIMER.trim());

    const extraFileLabel = new LabelBuilder()
        .setLabel("Extra Files (Optional)")
        .setFileUploadComponent(
            new FileUploadBuilder()
                .setCustomId("extraFiles")
                .setRequired(false)
                .setMinValues(0)
                .setMaxValues(5)
        );

    const furtherInformationLabel = new LabelBuilder()
        .setLabel("Further Information")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("furtherInformation")
                .setPlaceholder("Default: N/A")
                .setStyle(TextInputStyle.Paragraph)
        );

    modal.addTextDisplayComponents(fileFormatTextDisplayLabel);
    modal.addLabelComponents(businessLicenseLabel, extraFileLabel, furtherInformationLabel);

    return await interaction.showModal(modal);
}

export async function dev_request_property_modal(interaction: CommandInteraction | ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId("property-request-modal")
        .setTitle("Property Development Request");

    const landPermitLabel = new LabelBuilder()
        .setLabel("BLM Land Permit")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("landPermit")
                .setPlaceholder("[LINK TO LAND MANAGEMENT DATABASE PROPERTY LISTING]")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

    const propertyIntentionsLabel = new LabelBuilder()
        .setLabel("Property Intentions")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("propertyIntentions")
                .setPlaceholder("[INTENTIONS]")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
        );

    const furtherInformationLabel = new LabelBuilder()
        .setLabel("Further Information")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("furtherInformation")
                .setPlaceholder("Default: N/A")
                .setStyle(TextInputStyle.Paragraph)
        );

    modal.addLabelComponents(landPermitLabel, propertyIntentionsLabel, furtherInformationLabel);
    return await interaction.showModal(modal);
}

export async function dev_submit_property_modal(interaction: CommandInteraction | ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId("property-submission-modal")
        .setTitle("Property Development Submission");

    const landPermitLabel = new LabelBuilder()
        .setLabel("BLM Land Permit")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("landPermit")
                .setPlaceholder("[LINK TO LAND MANAGEMENT DATABASE PROPERTY LISTING]")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

    const textDisplayLabel = new TextDisplayBuilder()
        .setContent("Ensure the property file is in .rbxm format. Your submission will be declined if it includes the wrong format.");

    const propertyFileLabel = new LabelBuilder()
        .setLabel("Property File")
        .setFileUploadComponent(
            new FileUploadBuilder()
                .setCustomId("propertyFile")
                .setRequired(true)
                .setMinValues(1)
                .setMaxValues(1)
        );

    const bannerImageLabel = new LabelBuilder()
        .setLabel("Exterior Banner Image")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("bannerImage")
                .setPlaceholder("rbxassetid://1234567890")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

    const furtherInformationLabel = new LabelBuilder()
        .setLabel("Further Information")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("furtherInformation")
                .setPlaceholder("Default: N/A")
                .setStyle(TextInputStyle.Paragraph)
        );

    modal.addLabelComponents(landPermitLabel);
    modal.addTextDisplayComponents(textDisplayLabel);
    modal.addLabelComponents(propertyFileLabel, bannerImageLabel, furtherInformationLabel);
    return await interaction.showModal(modal);
}

export async function blm_property_activity_modal(interaction: CommandInteraction | ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId("activity-modal")
        .setTitle("Property Activity Submission");

    const businessNameLabel = new LabelBuilder()
        .setLabel("Business")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("businessName")
                .setPlaceholder("Spectra Pipeline Management")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

    const randomTextDisplay = new TextDisplayBuilder()
        .setContent("Please select the property district from the dropdown menu below.");

    const propertyMenu = new LabelBuilder()
        .setLabel("Property District")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId("propertyDistrict")
                .setPlaceholder("Select the property district")
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Redwood")
                        .setValue("Redwood")
                        .setDescription("Properties located within the Redwood District"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Arborfield")
                        .setValue("Arborfield")
                        .setDescription("Properties located within the Arborfield District"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Prominence")
                        .setValue("Prominence")
                        .setDescription("Properties located within the Prominence District"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Unincorporated")
                        .setValue("Unincorporated")
                        .setDescription("Properties located within the Hillview, Greendale and Arborfield Farms Districts"),
                )
                .setRequired(true)
        )

    const propertyActivityLabel = new LabelBuilder()
        .setLabel("Property Activity Evidence")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("propertyActivity")
                .setPlaceholder("[LINK]")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
        );

    const additionalInformationLabel = new LabelBuilder()
        .setLabel("Additional Information")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("additionalInformation")
                .setPlaceholder("Default: N/A")
                .setStyle(TextInputStyle.Paragraph)
        );

    modal.addLabelComponents(businessNameLabel);
    modal.addTextDisplayComponents(randomTextDisplay);
    modal.addLabelComponents(propertyMenu, propertyActivityLabel, additionalInformationLabel);

    return await interaction.showModal(modal);
}

export async function blm_property_request_modal(interaction: CommandInteraction | ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId("request-modal")
        .setTitle("New Property Aquisition Request");

    const permitLabel = new LabelBuilder()
        .setLabel("Business Permit")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("businessPermit")
                .setPlaceholder("https://trello.com/b/r4a8Tw1I/commerce-permit-database")
                .setStyle(TextInputStyle.Short)
        );

    const businessGroupLabel = new LabelBuilder()
        .setLabel("Business Group")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("businessGroup")
                .setPlaceholder("Firestone Department of Commerce")
                .setStyle(TextInputStyle.Short)
        );

    const propertiesBeforeLabel = new LabelBuilder()
        .setLabel("Will this be your first or second property?")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("propertiesBefore")
                .setPlaceholder("[FIRST / SECOND]")
                .setStyle(TextInputStyle.Paragraph)
        );

    const requestedLandLabel = new LabelBuilder()
        .setLabel("What property would you like to request")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("requestedLand")
                .setPlaceholder("[LINK]")
                .setStyle(TextInputStyle.Short)
        );

    const propertyUseLabel = new LabelBuilder()
        .setLabel("How will your property be used?")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("propertyUse")
                .setStyle(TextInputStyle.Paragraph)
        );

    modal.addLabelComponents(
        permitLabel,
        businessGroupLabel,
        propertiesBeforeLabel,
        requestedLandLabel,
        propertyUseLabel
    );

    return await interaction.showModal(modal);
}

export async function noyra_customer_rating_modal(interaction: CommandInteraction | ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId("customer-rating-modal")
        .setTitle("Nøyra Customer Rating");

    const workProductLabel = new LabelBuilder()
        .setLabel("Work Product")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("workProduct")
                .setPlaceholder("The product or solution you received\ne.g. Commerce Service Desk, [BUSINESS NAME] Interior, etc.")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        );

    const professionalRatingLabel = new LabelBuilder()
        .setLabel("How would you rate our professional services?")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId("professionalRating")
                .setPlaceholder("Select a rating from 1 to 10")
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("1")
                        .setValue("★☆☆☆☆")
                        .setDescription("Very Unsatisfied"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("2")
                        .setValue("★★☆☆☆")
                        .setDescription("Unsatisfied"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("3")
                        .setValue("★★★☆☆")
                        .setDescription("Neutral"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("4")
                        .setValue("★★★★☆")
                        .setDescription("Satisfied"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("5")
                        .setValue("★★★★★")
                        .setDescription("Very Satisfied")
                )
        );

    const recommendRatingLabel = new LabelBuilder()
        .setLabel("How likely are you to recommend us to others?")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId("recommendRating")
                .setPlaceholder("Select a rating from 1 to 10")
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("1")
                        .setValue("★☆☆☆☆")
                        .setDescription("Very Unlikely"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("2")
                        .setValue("★★☆☆☆")
                        .setDescription("Unlikely"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("3")
                        .setValue("★★★☆☆")
                        .setDescription("Neutral"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("4")
                        .setValue("★★★★☆")
                        .setDescription("Likely"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("5")
                        .setValue("★★★★★")
                        .setDescription("Very Likely")
                )
        );

    const workAgainLabel = new LabelBuilder()
        .setLabel("Would you work with us again?")
        .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
                .setCustomId("workAgainRating")
                .setPlaceholder("Yes or No")
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel("Yes")
                        .setValue("Yes")
                        .setDescription("You would work with us again"),
                    new StringSelectMenuOptionBuilder()
                        .setLabel("No")
                        .setValue("No")
                        .setDescription("You would not work with us again")
                )
        );

    const feedbackLabel = new LabelBuilder()
        .setLabel("Additional Feedback")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId("additionalFeedback")
                .setPlaceholder("Default: N/A")
                .setStyle(TextInputStyle.Paragraph)
        );

    modal.addLabelComponents(workProductLabel, professionalRatingLabel, recommendRatingLabel, workAgainLabel, feedbackLabel);

    return await interaction.showModal(modal);
}