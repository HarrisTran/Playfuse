import type { VirtualFS } from "./vfs.js";
import { normalizePath } from "./path.js";
import { buildAssetsMap, buildZipPayload } from "./encoder/index.js";
import { scanProject } from "./scanner/index.js";
import { networkRegistry } from "./adapters/registry.js";
import { injectHTML } from "./injector/index.js";

export interface PackOptions {
    debug?: boolean | undefined;
    onProgress?: (step: string, percent: number) => void;
}

export interface PlayableOutputFile {
    network: string;
    fileName: string;
    relativePath: string;
    content: string;
}

export function packProjectCore(
    vfs: VirtualFS,
    runtimeCode: string,
    network: string = 'generic',
    options?: PackOptions
): PlayableOutputFile[] {
    const scanResult = scanProject(vfs);
    const assetFiles = [
        ...(scanResult.assets as string[]),
        ...(scanResult.configs.settings ? [scanResult.configs.settings] : []),
        ...(scanResult.configs.importMap ? [scanResult.configs.importMap] : []),
    ];
    let assetsMap: Record<string, string> | undefined;
    let zipBase64: string | undefined;

    if (options?.debug) {
        assetsMap = buildAssetsMap(vfs, assetFiles);
    } else {
        zipBase64 = buildZipPayload(vfs, assetFiles);
    }
    const decode = (p: string) => new TextDecoder().decode(vfs.get(p)!);
    const htmlContent = decode(scanResult.html);
    const styles = scanResult.stylesheets.map(decode);
    const engineScripts = scanResult.engineScripts.map(decode);
    const gameScripts = scanResult.gameScripts.map(decode);
    let importMapContent = '{}';
    if (scanResult.configs.importMap) {
        const rawMap = decode(scanResult.configs.importMap);
        try {
            const mapObj = JSON.parse(rawMap);
            const mapPath = scanResult.configs.importMap;
            const lastSlash = mapPath.lastIndexOf('/');
            const baseDir = lastSlash !== -1 ? mapPath.slice(0, lastSlash) : '';
            const resolvePath = (val: string) => {
                const joined = baseDir ? `${baseDir}/${val}` : val;
                const normalized = normalizePath(joined);
                return normalized.startsWith('.') ? normalized : './' + normalized;
            };

            if (mapObj.imports) {
                for (const key in mapObj.imports) {
                    mapObj.imports[key] = resolvePath(mapObj.imports[key]);
                }
            }
            if (mapObj.scopes) {
                for (const scope in mapObj.scopes) {
                    for (const key in mapObj.scopes[scope]) {
                        mapObj.scopes[scope][key] = resolvePath(mapObj.scopes[scope][key]);
                    }
                }
            }
            importMapContent = JSON.stringify(mapObj);
        } catch (e) {
            importMapContent = rawMap;
        }
    }

    const adapters = networkRegistry.resolveNetworks(network);
    const outputs: PlayableOutputFile[] = [];
    for (const adapter of adapters) {
        const finalHtml = injectHTML({
            htmlContent,
            styles,
            engineScripts,
            gameScripts,
            assetsMap,
            zipBase64,
            runtimeCode,
            importMapContent,
            adapter,
            debug: options?.debug,
        });
        outputs.push({
            network: adapter.id,
            fileName: 'index.html',
            relativePath: `${adapter.id}/index.html`,
            content: finalHtml,
        })
    }
    return outputs;
}