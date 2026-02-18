import * as rocloudType from "./types"

const BASE_URL = "https://apis.roblox.com/cloud";

export class rocloud {
    private open_cloud_api_key: string;

    constructor(open_cloud_api_key?: string) {
        this.open_cloud_api_key = open_cloud_api_key || process.env.OPEN_CLOUD_API_KEY || "";
    }

    // Core

    private sendRequest(endpoint: string, method: string, body?: { [key: string]: any }): Promise<Response> {
        if (!this.open_cloud_api_key) {
            throw new Error("Open Cloud API key is not set.");
        }

        console.log(`Sending ${method} request to ${endpoint} with body:`, body);

        body = body || {};
        body.apiKey = this.open_cloud_api_key;

        return fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.open_cloud_api_key}`
            },
            body: JSON.stringify(body)
        });
    }

    public async introspect(): Promise<rocloudType.introspectResponse> {
        const response = await this.sendRequest("https://apis.roblox.com/api-keys/v1/introspect", "POST", {});
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    //// Groups

    public async GetGroup(groupId: string): Promise<rocloudType.groupResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}`, "GET");
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    // Group Join Requests

    public async ListGroupJoinRequests(groupId: string, maxPageSize?: number, pageToken?: string, filter?: string): Promise<rocloudType.listGroupJoinRequestsResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/join-requests`, "GET", {
            groupId, maxPageSize, pageToken, filter
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    public async AcceptGroupJoinRequest(groupId: string, join_request_id: string): Promise<rocloudType.rocloudResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/join-requests/${join_request_id}:accept`, "POST");
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    public async DeclineGroupJoinRequest(groupId: string, join_request_id: string): Promise<rocloudType.rocloudResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/join-requests/${join_request_id}:decline`, "POST");
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    // Group Memberships

    public async ListGroupMemberships(groupId: string, maxPageSize?: number, pageToken?: string, filter?: string): Promise<rocloudType.listGroupMembershipsResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/memberships`, "GET", {
            groupId, maxPageSize, pageToken, filter
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    public async UpdateGroupMembership(groupId: string, membershipId: string, roleId: string): Promise<rocloudType.groupMembershipResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/memberships/${membershipId}`, "PATCH", {
            path: groupId,
            user: membershipId,
            role: roleId
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    // Group Roles

    public async ListGroupRoles(groupId: string, maxPageSize?: number, pageToken?: string): Promise<rocloudType.listGroupRolesResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/roles`, "GET", {
            groupId, maxPageSize, pageToken
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    public async GetGroupRole(groupId: string, roleId: string): Promise<rocloudType.groupRoleResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/roles/${roleId}`, "GET");
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    // Group Relationships
    public async GetGroupRelationships(groupId: string, maxPageSize?: number, pageToken?: string): Promise<rocloudType.listGroupRelationshipsResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/relationships`, "GET", {
            groupId, maxPageSize, pageToken
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }

        return { status: response.status, data };
    }

    public async CreateGroupRelationship(groupId: string, relationshipType: rocloudType.groupRelationshipType, targetGroupId: string): Promise<rocloudType.rocloudResponse> {
        console.log(`Creating group relationship: ${groupId} -> ${targetGroupId} (type ${relationshipType})`);
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/relationships/${relationshipType}/${targetGroupId}`, "POST", {
            groupId, targetGroupId, relationshipType
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }
        return { status: response.status, data };
    }

    public async DeleteGroupRelationship(groupId: string, relationshipType: rocloudType.groupRelationshipType, targetGroupId: string): Promise<rocloudType.rocloudResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/relationships/${relationshipType}/${targetGroupId}`, "DELETE", {
            groupId, targetGroupId, relationshipType
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }
        return { status: response.status, data };
    }

    public async GetGroupRelationshipRequests(groupId: string, groupRelationshipType: string, StartRowIndex: number, MaxRows: number): Promise<rocloudType.rocloudResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/relationships/${groupRelationshipType}/requests`, "GET", {
            groupId, groupRelationshipType, StartRowIndex, MaxRows
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }
        return { status: response.status, data };
    }

    public async AcceptGroupRelationshipRequest(groupId: string, groupRelationshipType: string, targetGroupId: string): Promise<rocloudType.rocloudResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/relationships/${groupRelationshipType}/${targetGroupId}`, "POST", {
            groupId, groupRelationshipType, targetGroupId
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }
        return { status: response.status, data };
    }

    public async DeclineGroupRelationshipRequest(groupId: string, groupRelationshipType: string, targetGroupId: string): Promise<rocloudType.rocloudResponse> {
        const response = await this.sendRequest(`${BASE_URL}/v2/groups/${groupId}/relationships/${groupRelationshipType}/${targetGroupId}`, "DELETE", {
            groupId, groupRelationshipType, targetGroupId
        });
        const data = await response.json();
        if (!response.ok) {
            return { status: response.status, data, errorMessage: data.errorMessage };
        }
        return { status: response.status, data };
    }
}

export { rocloudType as rocloudTypes };