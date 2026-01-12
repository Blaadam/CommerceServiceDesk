import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Channel,
	EmbedBuilder,
	PermissionFlagsBits,
	TextChannel,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils";
import * as Sentry from "@sentry/node";

@ApplyOptions<Command.Options>({
	name: "land-deadline",
	description: "Create a deadline announcement for Activity Submissions",
	cooldownDelay: 10_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)


				.addStringOption(option =>
					option.setName('deadline-date')
						.setDescription('Deadline for submissions')
						.setRequired(true))

				.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		return SentryHelper.tracer(interaction, {
			name: "Deadline Announcement Command",
			op: "command.deadlineAnnouncement",
		}, async (span: any) => {
			try {
				const submissionDeadline: string = interaction.options.getString("deadline-date", true);

				const newEmbed = new EmbedBuilder()
					.setAuthor({
						name: interaction.user.tag,
						iconURL:
							interaction.user.displayAvatarURL({ extension: "png", size: 512 }),
					})
					.setTitle("Notice of Deadline for Activity Reports")
					.setDescription(
						"Attention Land Owners," +
						"\n\nWe want to inform you that the deadline for submitting your activity reports is quickly approaching." +
						`To ensure compliance, we kindly request all landowners to submit their activity reports by **${submissionDeadline}**.` +
						"Your prompt cooperation will greatly assist us in maintaining accurate records and making informed decisions." +
						"\n\nPlease click the green button or use the /newactivity command to submit notice of activity" +
						"\n\nThank you for your attention to this matter. We greatly appreciate your cooperation in helping us effectively manage our land resources." +
						"\n\nSincerely," +
						"\n\nFirestone Bureau of Land Management"
					)
					.setTimestamp()
					.setColor(global.embeds.embedColors.mgmt)
					.setFooter(global.embeds.embedFooter);

				// Create a link button
				const SendActivity = new ButtonBuilder()
					.setCustomId('activity-button')
					.setLabel('Submit Activity')
					.setStyle(ButtonStyle.Success);

				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(SendActivity);

				const channel: Channel = await interaction.client.channels.fetch(global.ChannelIDs.deadlineAnnouncements);
				if (!channel || !(channel instanceof TextChannel)) {
					span.setAttribute("command.status", "failed");
					return interaction.editReply({
						content: "The deadline announcements channel could not be found.",
					});
				}

				span.setAttribute("command.output.channel", channel.id);
				channel.send({ content: "<@&1164856752181870642>", embeds: [newEmbed], components: [row] });
				span.setAttribute("command.status", "success");

				await interaction.editReply({
					content: "Deadline announcement has been sent to the channel.",
				});
				span.end();
			}
			catch (error) {
				Sentry.captureException(error);
				span.setAttribute("command.status", "error");

				return interaction.editReply({
					content: "There was an error while executing this command.",
				});
			}
		});
	}
}
