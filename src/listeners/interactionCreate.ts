import { Listener } from '@sapphire/framework';
import { Interaction } from 'discord.js';
import { SentryHelper } from '../shared/sentry-utils.ts';

export class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			event: 'interactionCreate',
			once: false
		});
	}

	async run(interaction: Interaction) {
		SentryHelper.logInteraction(interaction);
	}
}