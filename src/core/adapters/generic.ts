import type { AdNetworkAdapter } from "./types.js";

export class GenericAdapter implements AdNetworkAdapter {
    readonly id = 'generic';
    readonly name = 'Generic / Web Preview';

    wrapCTA(storeUrl?: string): string {
        const defaultUrl = storeUrl ? JSON.stringify(storeUrl) : '""';
        return `
        <script>
            window.installClick = function (overrideUrl) {
                var target = overrideUrl || ${defaultUrl};
                if (target) {
                    window.open(target, '_blank');
                } else {
                    window.open('about:blank', '_blank');
                }
            };
        </script>
        `;
    }
}

export const genericAdapter = new GenericAdapter();