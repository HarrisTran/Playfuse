import type { AdNetworkAdapter } from "./types.js";
import { genericAdapter } from "./ads_network/generic.js";
import { applovinAdapter } from "./ads_network/applovin.js";
import { googleAdapter } from "./ads_network/google.js";
import { mintegralAdapter } from "./ads_network/mintegral.js";

export class NetworkRegistry {
    private adapters = new Map<string, AdNetworkAdapter>();

    constructor() {
        this.register(genericAdapter);
        this.register(applovinAdapter);
        this.register(googleAdapter);
        this.register(mintegralAdapter);
    }

    register(adapter: AdNetworkAdapter): void {
        this.adapters.set(adapter.id.toLowerCase(), adapter);
    }

    get(id: string): AdNetworkAdapter {
        const adapter = this.adapters.get(id.toLowerCase());
        if (!adapter) {
            const available = Array.from(this.adapters.keys()).join(', ');
            throw new Error(`Adapter "${id}" not found. Available adapters: ${available}`);
        }
        return adapter;
    }

    has(id: string): boolean {
        return this.adapters.has(id.toLowerCase());
    }

    list(): AdNetworkAdapter[] {
        return Array.from(this.adapters.values());
    }

    /**
     * Phân giải chuỗi network ID thành mảng các AdNetworkAdapter.
     * Hỗ trợ:
     * - 'all': trả về tất cả adapter đã đăng ký
     * - 'google,mintegral' hoặc 'google'
     * - undefined hoặc rỗng '': mặc định trả về [generic]
     */
    resolveNetworks(input?: string): AdNetworkAdapter[] {
        if (!input || input.trim() === '') {
            return [this.get('generic')];
        }

        const normalized = input
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

        if (normalized.length === 0) {
            return [this.get('generic')];
        }

        if (normalized.includes('all')) {
            return this.list();
        }

        const result: AdNetworkAdapter[] = [];
        const seen = new Set<string>();

        for (const id of normalized) {
            const adapter = this.get(id);
            if (!seen.has(adapter.id.toLowerCase())) {
                seen.add(adapter.id.toLowerCase());
                result.push(adapter);
            }
        }

        return result;
    }
}

export const networkRegistry = new NetworkRegistry();