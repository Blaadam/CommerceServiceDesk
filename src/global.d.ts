export {};

declare global {
    var embeds: {
        embedColors: {
            mgmt: `#${string}`;
            activity: `#${string}`;
            blm: `#${string}`;
            noyra: `#${string}`;
            default: `#${string}`;
            error: `#${string}`;
            success: `#${string}`;
        };
        accentColors: {
            mgmt: number;
            activity: number;
            blm: number;
            noyra: number;
            default: number;
            error: number;
            success: number;
        };
        embedFooter: {
            text: string;
            iconURL: string;
        };
    };

    var ChannelIDs: {
        deadlineAnnouncements: string;
        landSubmissions: string;
        devSupportTickets: string;
        devSupportTextTickets: string;
        rolesChannel: string;
        blmRevokeLand: string;
        publicAds: string;
        docmAnnouncements: string;
        noyraCustomerFeedback: string;
        noyraCustomerTestimonials: string;
    };

    var RoleIDs: {
        v2Devs: string;
        docm_fsLeadership: string;
        docm_fsDeveloper: string;
        docm_lm_notif_opt: string;
        docm_blm_leadership: string;
        noyra_seniorMgmt: string;
    };

    var GuildIDs: {
        mainServer: string | undefined;
        supportServer: string;
    };
}