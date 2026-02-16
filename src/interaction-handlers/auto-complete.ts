import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { AutocompleteInteraction } from 'discord.js';
import * as autocompletes from "../autocompletes/index.js";
import { SentryHelper } from '../shared/sentry-utils.js';
import Sentry from "@sentry/node";


export class AutocompleteHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Autocomplete
    });
  }

  public override async run(interaction: AutocompleteInteraction, result: InteractionHandler.ParseResult<this>) {
    return interaction.respond(result);
  }

  public override async parse(interaction: AutocompleteInteraction) {
    return SentryHelper.tracer(interaction, {
      name: "Autocomplete Handler",
      op: "autocomplete.handler.parse",
    }, async (span: any) => {
      span.setAttribute("interaction.commandId", interaction.commandId);
      span.setAttribute("interaction.commandName", interaction.commandName);
      span.setAttribute("interaction.userId", interaction.user?.id);
      span.setAttribute("interaction.userTag", interaction.user?.tag);

      try {

        if (autocompletes[interaction.commandName]) {

          const autocompleteFunction = autocompletes[interaction.commandName];
          const choices = await autocompleteFunction(interaction, span);
          return this.some(choices || []);
        }

        this.container.logger.warn(`No autocomplete function found for command ${interaction.commandName}`);
        return this.none();

      } catch (error) {
        console.error("Error in autocomplete handler:", error);
        Sentry.captureException(error);
        return this.none();
      }
    })
  }
}