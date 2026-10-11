import type { AdNetworkAdapter } from "./types.js";
import { genericAdapter } from "./generic.js";

export class NetworkRegistry {
    private adapters = new Map<string, AdNetworkAdapter>();

    constructor() {
        this.register(genericAdapter);
    }

    register(adapter: AdNetworkAdapter): void {
        this.adapters.set(adapter.id.toLowerCase(), adapter);
    }

    get(id: string): AdNetworkAdapter {
        const adapter = this.adapters.get(id.toLowerCase());
        if (!adapter) {
            throw new Error(`Adapter ${id} not found`);
        }
        return adapter;
    }

    has(id: string): boolean {
        return this.adapters.has(id.toLowerCase());
    }

    list(): AdNetworkAdapter[] {
        return Array.from(this.adapters.values());
    }
}

export const networkRegistry = new NetworkRegistry();