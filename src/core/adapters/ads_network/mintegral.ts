import type { AdNetworkAdapter } from "../types.js";

export class MintegralAdapter implements AdNetworkAdapter {
    readonly id = 'mintegral';
    readonly name = 'Mintegral';

    injectBody(): string {
        return `<script>
                    window.gameStart = window.gameStart || function () { console.log('[Mintegral] Game Start'); };
                    window.gameClose = window.gameClose || function () { console.log('[Mintegral] Game Close'); };
                </script>`;
    }

    wrapCTA(storeUrl?: string): string {
        const defaultUrl = storeUrl ? JSON.stringify(storeUrl) : '""';
        return `
        <script>
            window.installClick = function (overrideUrl) {
                var target = overrideUrl || ${defaultUrl};
                if (typeof window.install === 'function') {
                    window.install(target);
                } else if (typeof mraid !== 'undefined' && mraid.open) {
                    mraid.open(target);
                } else {
                    window.open(target, '_blank');
                }
            };
        </script>
        `;
    }
}

export const mintegralAdapter = new MintegralAdapter();