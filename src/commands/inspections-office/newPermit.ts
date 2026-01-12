import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
	DMChannel,
	GuildMember,
	PermissionFlagsBits,
	Role,
	type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SentryHelper } from "../../shared/sentry-utils.js";
import Sentry from "@sentry/node";

@ApplyOptions<Command.Options>({
	name: "new-permit",
	description: "Sends a message that an individual passed their Business Permit Application",
	cooldownDelay: 5_000,
})
export default class ViewHistoryCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry
	) {
		registry.registerChatInputCommand((command) => {
			command
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption(option =>
					option.setName('user')
						.setDescription('The name of person who passed the application')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('permit')
						.setDescription('The link to permit on docm permit trello board')
						.setRequired(true))
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
		});
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: ["Ephemeral"] });

		return SentryHelper.tracer(interaction, {
			name: "New Permit Command",
			op: "command.newPermit",
		}, async (span: any) => {
			try {
				const permitLink: string = interaction.options.getString('permit');
				const member: GuildMember = interaction.options.getMember('user') as GuildMember;
				const businessRepRole: Role | undefined = member.guild.roles.cache.find(role => role.name === "Business Representative");

				if (businessRepRole && !member.roles.cache.has(businessRepRole.id)) {
					member.roles.add(businessRepRole);
				}

				const passMessage = "**Permitted Business Message**\r\n"
					+ "\r\n"
					+ `Hello ${member} , \r\n`
					+ "\r\n"
					+ "I am sending this to inform you that your permit application has passed inspection and has been signed meaning that you are officially a licensed business owner. Please be sure to do the following if they have not already been completed:\r\n"
					+ "\r\n"
					+ "- Since you have the Business Representative role in the Department of Commerce Discord server, **abbreviate your business's name in your username**.\r\n"
					+ "- Join the Commerce group and tag the Secretary and Deputy Secretary in <#735894843548500079> to be ranked.\r\n"
					+ "- Tag a Firestone Discord moderator with a link to your permit to get the role on the main State of Firestone Discord server.\r\n"
					+ "- Send a group ally request and request for it to be accepted in <#735894843548500079> . \r\n"
					+ "- In the Department of Commerce Discord server, use `/newrequest` to request property."
					+ "\r\n"
					+ `\r\n`
					+ `If you have any questions, feel free to DM ${interaction.user} or reach out to any other Commerce Employees.\r\n`
					+ "\r\n"
					+ "**Business Permit Link: " + permitLink + "**\r\n"
					+ "\r\n"
					+ "Regards,\r\n"
					+ `${interaction.user} \r\n`
					+ "Firestone Department of Commerce";

				if (!member) {
					return interaction.editReply({ content: "User not found." });
				}

				const dmChannel: DMChannel | undefined = await member.createDM();
				if (!dmChannel) {
					return interaction.editReply({ content: "Could not create DM channel." });
				}

				Sentry.metrics.count("inspections.permits.issued", 1, {
					attributes: {
						"inspector.id": interaction.user.id,
						"inspector.tag": interaction.user.tag,
						
						"recipient.id": member.user.id,
						"recipient.tag": member.user.tag
					}
				});

				dmChannel.send(passMessage);
				await interaction.editReply({ content: `Message sent to ${member.user.tag} successfully!` });
				span.setAttribute("command.status", "success");
			} catch (error) {
				Sentry.captureException(error);
				span.setAttribute("command.status", "error")
				return interaction.editReply({ content: "There was an error while executing this command." });
			}
		});
	}
}
