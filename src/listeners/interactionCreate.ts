import { Listener } from '@sapphire/framework';
import { Interaction } from 'discord.js';
import { SentryHelper } from '../shared/sentry-utils';

export class UserEvent extends Listener {
	constructor(context, options = {}) {
		super(context, {
			...options,
			event: 'interactionCreate',
			once: false
		});
	}

	async run(interaction: Interaction) {
		await SentryHelper.logInteraction(interaction);
	}
}