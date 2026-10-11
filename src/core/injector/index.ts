import type { AdNetworkAdapter } from "../adapters/types.js";

export interface InjectorOptions {
    htmlContent: string;
    styles: string[];
    engineScripts: string[];
    gameScripts: string[];
    assetsMap?: Record<string,string> | undefined;
    zipBase64?: string | undefined;
    runtimeCode: string;
    importMapContent: string;
    adapter?: AdNetworkAdapter;
    debug?: boolean | undefined;
}

export function injectHTML(options: InjectorOptions) : string {
    let html = options.htmlContent;

    // Extract inline boot script (e.g. System.import) to execute after all scripts are registered
    // Prevent greedy matching from the first <script> tag by ensuring no </script> is inside the match
    const bootMatch = html.match(/<script[^>]*>(?:(?!<\/script>)[\s\S])*?System\.import(?:(?!<\/script>)[\s\S])*?<\/script>/i);
    let bootScript = '';
    if (bootMatch) {
        bootScript = bootMatch[0];
        html = html.replace(bootMatch[0], '');
    }

    // Clean comments, links and external scripts
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    html = html.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*\/?>/gi, '');
    html = html.replace(/<script[^>]*src="[^"]*"[^>]*>\s*<\/script>/gi, '');
    
    let cssContent = `<style>${options.styles.join('')}</style>`;
    let adapterHeadContent = options.adapter?.injectHead?.() || '';
    html = html.replace('</head>', cssContent + adapterHeadContent + '</head>');

    let assetMapContent = '';
    let runtimeContent = '';
    let systemJsHook = '';

    if (options.debug) {
        assetMapContent = `<script>window.__assetsMap__ = ${JSON.stringify(options.assetsMap || {})};</script>`;
        runtimeContent = `<script>${options.runtimeCode}\nif(typeof __pf!=='undefined'&&__pf.init)__pf.init(window.__assetsMap__);</script>`;
        systemJsHook = `<script>
    (function(){
        const System = window.System;
        if (System && System.constructor && System.constructor.prototype) {
            System.constructor.prototype.shouldFetch = function () {
                return true;
            };
        }
    })();
    </script>`;
    } else {
        const payload = options.zipBase64 ? JSON.stringify(options.zipBase64) : JSON.stringify(options.assetsMap || {});
        runtimeContent = `<script>(function(){var __a=${payload};${options.runtimeCode};if(typeof __pf!=='undefined'&&__pf.init)__pf.init(__a);})();</script>`;
        systemJsHook = `<script>(function(){var s=window.System;s&&s.constructor&&s.constructor.prototype&&(s.constructor.prototype.shouldFetch=function(){return!0})})();</script>`;
    }

    let importMapScript = `<script type="systemjs-importmap">${options.importMapContent}</script>`;
    let engineScriptsContent = `<script>${options.engineScripts.join('\n')}</script>`;
    let gameScriptsContent = `<script>${options.gameScripts.join('\n')}</script>`; // empty now

    let adapterBodyContent = options.adapter?.injectBody?.() || '';
    let wrapCTA = options.adapter?.wrapCTA?.() || ''
    html = html.replace('</body>', () => assetMapContent + runtimeContent + importMapScript + engineScriptsContent + systemJsHook + gameScriptsContent + bootScript + adapterBodyContent + wrapCTA + '</body>');

    return html;
}