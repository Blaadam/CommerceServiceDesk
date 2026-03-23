import { Route } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';

export class MyRoute extends Route {
    public run(request: ApiRequest, response: ApiResponse) {
        return response.json({ message: 'Hello, World!' });
    }
}