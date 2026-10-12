import type { AdNetworkAdapter } from "../types.js";

export class GoogleAdapter implements AdNetworkAdapter {
    readonly id = 'google';
    readonly name = 'Google Ads (ExitApi)';

    injectHead(): string {
        return `<meta name="ad.size" content="width=320,height=480">
        <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>`;
    }

    wrapCTA(storeUrl?: string): string {
        const defaultUrl = storeUrl ? JSON.stringify(storeUrl) : '""';
        return `
        <script>
            window.installClick = function (overrideUrl) {
                var target = overrideUrl || ${defaultUrl};
                if (typeof ExitApi !== 'undefined' && ExitApi.exit) {
                    ExitApi.exit(target);
                } else {
                    window.open(target, '_blank');
                }
            };
        </script>
        `;
    }
}

export const googleAdapter = new GoogleAdapter();