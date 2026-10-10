export interface InjectorOptions {
    htmlContent: string;
    styles: string[],
    engineScripts: string[],
    gameScripts: string[],
    assetsMap: Record<string,string>,
    runtimeCode: string,
    importMapContent: string,
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
    html = html.replace('</head>', cssContent + '</head>');

    let assetMapContent = `<script>window.__assetsMap__ = ${JSON.stringify(options.assetsMap)};</script>`;
    let runtimeContent = `<script>${options.runtimeCode}</script>`;
    let importMapScript = `<script type="systemjs-importmap">${options.importMapContent}</script>`;
    let engineScriptsContent = `<script>${options.engineScripts.join('\n')}</script>`;
    let gameScriptsContent = `<script>${options.gameScripts.join('\n')}</script>`; // empty now

    const systemJsHook = `<script>
    (function(){
        const System = window.System;
        if (System && System.constructor && System.constructor.prototype) {
            const proto = System.constructor.prototype;
            const originalShouldFetch = proto.shouldFetch;
            proto.shouldFetch = function (url) {
                let uri = String(url).split('?')[0].split('#')[0];
                const baseUrl = location.href;
                let basePath = baseUrl;
                const lastSlash = baseUrl.lastIndexOf('/');
                if (lastSlash !== -1) basePath = baseUrl.substring(0, lastSlash + 1);
                if (uri.startsWith(basePath)) uri = uri.substring(basePath.length);
                else if (uri.startsWith(baseUrl)) uri = uri.substring(baseUrl.length);
                if (uri.startsWith('./')) uri = uri.substring(2);
                if (uri.startsWith('/')) uri = uri.substring(1);
                if (window.__assetsMap__[uri]) return true;
                if (originalShouldFetch) return originalShouldFetch.call(this, url);
                return false;
            };
        }
    })();
    </script>`;

    html = html.replace('</body>', () => assetMapContent + runtimeContent + importMapScript + engineScriptsContent + systemJsHook + gameScriptsContent + bootScript + '</body>');

    return html;
}