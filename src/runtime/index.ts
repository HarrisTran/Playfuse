import { injectNetworkHooks } from "./network.js";

let initialized = false;

export function init(assetsMap: Record<string, string>) {
    if (initialized) return;
    initialized = true;
    const baseUrl = typeof location !== 'undefined' ? location.href : '';
    injectNetworkHooks(assetsMap, baseUrl);
}

// Fallback for debug mode or direct window execution
if (typeof window !== 'undefined' && (window as any).__assetsMap__) {
    init((window as any).__assetsMap__);
}