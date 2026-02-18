export type rocloudResponse = {
    status: number;
    data: any;
    errorMessage?: string;
}

export type introspectResponse = rocloudResponse & {
    data: {
        name: string;
        authorizedUserId: number;
        scopes: [
            {
                name: string;
                operations: string[];
                userIds: [number | string][] | null;
                groupIds: [number | string][] | null;
                universeIds: [number | string][] | null;
                universeDatastores: {
                    universeId: number | string;
                    datastoreName: string;
                }[] | null;
            }
        ],
        enabled: boolean;
        expired: boolean;
        expirationTimeUtc: string | null;
    }
}

//// Groups API

export type groupResponse = rocloudResponse & {
    data: {
        path: string;
        createTime: string;
        updateTime: string;
        id: string;
        displayName: string;
        description: string;
        owner: string;
        memberCount: number;
        publicEntryAllowed: boolean;
        locked: boolean;
        verified: boolean;
    }
}

export type groupJoinRequest = {
    path: string;
    createTime: string;
    user: string;
}

export type listGroupJoinRequestsResponse = rocloudResponse & {
    data: {
        requests: groupJoinRequest[];
        nextPageToken: string | null;
    }
}

export type groupMembership = {
    path: string;
    createTime: string;
    updateTime: string;
    user: string;
    role: string;
}

export type listGroupMembershipsResponse = rocloudResponse & {
    data: {
        memberships: groupMembership[];
        nextPageToken: string | null;
    }
}

export type groupMembershipResponse = rocloudResponse & {data: groupMembership}

export type groupRole = {
    path: string;
    createTime: string;
    updateTime: string;
    id: string;
    displayName: string;
    description: string;
    rank: number;
    memberCount: number;
    permissions: {
        viewWallPosts: boolean;
        createWallPosts: boolean;
        deleteWallPosts: boolean;
        viewGroupShout: boolean;
        createGroupShout: boolean;
        changeRank: boolean;
        acceptRequests: boolean;
        exileMembers: boolean;
        manageRelationships: boolean;
        viewAuditLog: boolean;
        spendGroupFunds: boolean;
        advertiseGroup: boolean;
        createAvatarItems: boolean;
        manageAvatarItems: boolean;
        manageGroupUniverses: boolean;
        viewUniverseAnalytics: boolean;
        createApiKeys: boolean;
        manageApiKeys: boolean;
        banMembers: boolean;
        viewForums: boolean;
        manageCategories: boolean;
        createPosts: boolean;
        lockPosts: boolean;
        pinPosts: boolean;
        removePosts: boolean;
        createComments: boolean;
        removeComments: boolean;
        manageBlockedWords: boolean;
        viewBlockedWords: boolean;
        bypassSlowMode: boolean;
    };
}

export type listGroupRolesResponse = rocloudResponse & {
    data: {
        roles: groupRole[];
        nextPageToken: string | null;
    }
}

export type groupRoleResponse = rocloudResponse & {data: groupRole}

// Group Relationships

export enum groupRelationshipType {
    Allies = 1,
    Enemies = 2,
    None = 0,
}

export type groupRelationship = {
    id: number;
    name: string;
    description: string;
    owner: {
        buildersClubMembershipType: number;
        hasVerifiedBadge: boolean;
        userId: number;
        username: string;
        displayName: string;
    };
    shout: {
        body: string;
        poster: {
            buildersClubMembershipType: number;
            hasVerifiedBadge: boolean;
            userId: number;
            username: string;
            displayName: string;
        };
        created: string;
        updated: string;
    };
    memberCount: number;
    isBuildersClubOnly: boolean;
    publicEntryAllowed: boolean;
    isLocked: boolean;
    hasVerifiedBadge: boolean;
    hasSocialModules: boolean;
}

export type groupRelationshipResponse = rocloudResponse & {
    data: groupRelationship
}

export type listGroupRelationshipsResponse = rocloudResponse & {
    data: {
        groupId: number,
        relationshipType: number,
        totalGroupCount: number,
        relatedGroups: groupRelationship[],
        nextRowIndex: number | null;
    }
}