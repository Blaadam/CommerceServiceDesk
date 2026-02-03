import { StartSpanOptions } from '@sentry/core';
import Sentry from '@sentry/node';
import type { Interaction, ModalSubmitInteraction, ChatInputCommandInteraction, ButtonInteraction, InteractionResponse, Message, RepliableInteraction } from 'discord.js';

export class SentryHelper {
	public static async tracer<T>(interaction: Interaction, options: StartSpanOptions, callback: (span: Sentry.Span) => T): Promise<T> {
		return await Sentry.startNewTrace<Promise<T>>(async () => {
			return await Sentry.withIsolationScope<Promise<T>>(async () => {
				return await Sentry.startSpan<Promise<T>>(options, async (span) => {
					try {
						await this.logInteraction(interaction, false, span);
						return await callback(span);
					}
					catch (error) {
						span.setStatus({ code: 2, message: "internal_error" });
						Sentry.captureException(error);

						if (interaction.isRepliable()) {
							this.interactionReply(
								interaction as RepliableInteraction,
								"An unexpected error occurred while processing your request. If this issue persists, please file a bug report."
							);
						}

						throw error;
					}
				});
			});
		});
	}


	/**
	 * Enriches a Sentry Span with Discord interaction data and increments metrics.
	 * @param interaction The Discord interaction object
	 * @param span The current Sentry span (optional)
	 */
	public static async logInteraction(interaction: Interaction, sendMetric: boolean = true, span?: any) {
		const data = this.extractInteractionData(interaction);

		// 1. Log to Sentry Metrics (Counter)
		if (sendMetric) {
			Sentry.metrics.count('interaction.create.count', 1, {
				attributes: data as Record<string, string | number | boolean>,
			});
		}

		// 2. Attach data to the Span if provided
		if (span) {
			Object.entries(data).forEach(([key, value]) => {
				// We use setAttribute for modern Sentry (v8+) or setData for older versions
				span.setAttribute?.(key, value) || span.setData?.(key, value);
			});
		}

		// 3. Optional: Add user info to the global Sentry scope
		Sentry.setUser({
			id: interaction.user.id,
			username: interaction.user.username,
		});

		return data;
	}

	private static async interactionReply(
		interaction: RepliableInteraction,
		replyContent: string
	): Promise<Message | InteractionResponse> {

		const payload = {
			content: replyContent || "An unexpected error occurred while processing your request.",
			embeds: [],
		};

		if (interaction.deferred || interaction.replied) {
			return interaction.editReply(payload);
		} else {
			// Note: ephemeral: true is often preferred for error messages
			return interaction.reply({ ...payload, ephemeral: true });
		}
	}

	private static extractInteractionData(interaction: Interaction) {
		const data: Record<string, any> = {
			'interaction.id': interaction.id,
			'interaction.type': this.getInteractionType(interaction),
			'interaction.createdTimestamp': interaction.createdTimestamp,
			'interaction.locale': interaction.locale,

			'user.id': interaction.user.id,
			'user.username': interaction.user.username,

			'guild.id': interaction.guild?.id || 'DM',
			'guild.name': interaction.guild?.name || 'DM',
			'channel.id': interaction.channel?.id || 'DM',
		};

		if (interaction.isModalSubmit()) {
			const modal = interaction as ModalSubmitInteraction;
			data['interaction.customId'] = modal.customId;
		} else if (interaction.isChatInputCommand()) {
			const cmd = interaction as ChatInputCommandInteraction;
			data['interaction.commandName'] = cmd.commandName;
		} else if (interaction.isButton()) {
			const btn = interaction as ButtonInteraction;
			data['interaction.customId'] = btn.customId;
		}

		return data;
	}

	private static getInteractionType(interaction: Interaction): string {
		if (interaction.isChatInputCommand()) return 'Command';
		if (interaction.isButton()) return 'Button';
		if (interaction.isModalSubmit()) return 'ModalSubmit';
		if (interaction.isAutocomplete()) return 'Autocomplete';
		if (interaction.isContextMenuCommand()) return 'ContextMenu';
		if (interaction.isAnySelectMenu()) return 'SelectMenu';

		return 'Unknown';
	}
}