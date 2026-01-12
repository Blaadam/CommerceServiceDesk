import { Command, ApplicationCommandRegistry } from "@sapphire/framework";
import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";

import { databaseConnection } from "../../database";
import * as Sentry from "@sentry/node";
import { SentryHelper } from "../../shared/sentry-utils.ts";
const connection = new databaseConnection();

async function GetManagersFromDistrict(district: string, span?: any) {
  var table = connection.prisma.managerTable

  var rows = await table.findMany({ where: { District: district } });

  span?.setAttribute("database.table", "managerTable");
  span?.setAttribute("database.query", `findMany where District = ${district}`);
  span?.setAttribute("database.result.count", rows.length);


  if (rows.length === 0) {
    return [`No managers found for district: ${district}`];
  }

  let managersList = rows.map((row) => {
    return `<@${row.DiscordId}> - ${row.TrelloId}`;
  });

  return managersList;
}

@ApplyOptions<Command.Options>({
  name: "get-managers",
  description: "Get the list of managers for a specific district",
  cooldownDelay: 1_000,
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
          option
            .setName('district')
            .setDescription('The district you want to view the managers for')
            .setRequired(true)
            .addChoices(
              { name: 'Redwood', value: 'Redwood' },
              { name: 'Arborfield', value: 'Arborfield' },
              { name: 'Prominence', value: 'Prominence' },
              { name: 'Unincorporated Areas', value: 'Unincorporated' }
            )
        );
    }, {
      guildIds: [],
    });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: ["Ephemeral"], });

    const district = interaction.options.getString("district", true);

    return SentryHelper.tracer(interaction, {
      name: "Get Managers Command",
      op: "command.getManagers",
    }, async (span: any) => {
      try {
        span.setAttribute("district.name", district);
        let managers: string[];
        try {
          managers = await GetManagersFromDistrict(district, span);
        } catch (err) {
          span.setStatus("error");
          span.setAttribute("error.message", (err as Error).message);

          console.error("Error fetching district managers:", err);
          managers = ["An error occurred while fetching the moderation history."];
        }

        span.setAttribute("district.managers.list", managers.join(", "));
        span.setAttribute("district.managers.count", managers.length);

        const newEmbed: EmbedBuilder = new EmbedBuilder()
          .setColor(global.embeds.embedColors.mgmt)
          .setTitle(`${district} Managers`)
          .setTimestamp()
          .setFooter(global.embeds.embedFooter)
          .setDescription(managers.join("\n"));

        span.setAttribute("command.status", "success");

        await interaction.editReply({
          embeds: [newEmbed]
        });

        span.end();
      } catch (error) {
        span.setStatus("error");
        span.setAttribute("error.message", (error as Error).message);
        span.setAttribute("command.status", "error");
        Sentry.captureException(error);

        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({
            content: "An unexpected error occurred while processing your request.",
            embeds: []
          });
        } else {
          return interaction.reply({
            content: "An unexpected error occurred while processing your request.",
          });
        }
      }
    });
  }
}
