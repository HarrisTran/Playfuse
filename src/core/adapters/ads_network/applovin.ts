import type { AdNetworkAdapter } from "../types.js";

export class AppLovinAdapter implements AdNetworkAdapter {
    readonly id = 'applovin';
    readonly name = 'AppLovin / IronSource (MRAID)';

    injectHead(): string {
        return `<script src="mraid.js"></script>`;
    }

    wrapCTA(storeUrl?: string): string {
        const defaultUrl = storeUrl ? JSON.stringify(storeUrl) : '""';
        return `
        <script>
            window.installClick = function (overrideUrl) {
                var target = overrideUrl || ${defaultUrl};
                if (typeof mraid !== 'undefined' && mraid.open) {
                    mraid.open(target);
                } else {
                    window.open(target, '_blank');
                }
            };
        </script>
        `;
    }
}

export const applovinAdapter = new AppLovinAdapter();