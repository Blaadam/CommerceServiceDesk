import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, Guild, GuildMember, Role } from 'discord.js';
import Sentry from "@sentry/node";

@ApplyOptions({
    name: "role-enrollment",
})
export class ButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith("enroll_")) return this.none();

        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        const guild: Guild = interaction.guild
        const roleName: string = interaction.customId.replace("enroll_", "")
        const member: GuildMember = guild.members.cache.get(interaction.user.id)

        const role: Role = interaction.guild.roles.cache.find(
            (role) => role.name === roleName
        );

        if (!role) {
            return interaction.reply({ content: `Role "${roleName}" was not found in ${guild.name}`, flags: ["Ephemeral"], })
        }

        const userHasRole = member.roles.cache.some(role => role.name === roleName)

        if (userHasRole) {
            await member.roles.remove(role);

            Sentry.metrics.count("role_enrollment.removals", 1, {
                attributes: {
                    "role.name": roleName,
                    "guild.id": guild.id,
                    "guild.name": guild.name,
                    "user.id": interaction.user.id,
                    "user.tag": interaction.user.tag
                }
            });

            return interaction.reply({ content: `Your role for \"${roleName}\" has been removed.`, flags: ["Ephemeral"], })
        }

        await member.roles.add(role);

        Sentry.metrics.count("role_enrollment.additions", 1, {
            attributes: {
                "role.name": roleName,
                "guild.id": guild.id,
                "guild.name": guild.name,
                "user.id": interaction.user.id,
                "user.tag": interaction.user.tag
            }
        });

        return interaction.reply({ content: `Your role for \"${roleName}\" has been added.`, flags: ["Ephemeral"], })
    }
}