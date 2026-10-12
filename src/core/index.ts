import { loadInput } from "../node/input.js";
import { networkRegistry } from "./adapters/index.js";
import { buildAssetsMap, buildZipPayload } from "./encoder/index.js";
import { injectHTML } from "./injector/index.js";
import { scanProject } from "./scanner/index.js";
import fs from 'fs';
import path from 'path';

/**
 * Chuẩn hóa file path thuần TypeScript (Pure TS - Runtime Agnostic):
 * - Đổi \ thành /
 * - Bỏ ./ ở đầu và các đoạn ./ ở giữa
 * - Gộp các dấu // liên tiếp
 * - Rút gọn a/b/../c -> a/c bằng Stack
 * - Hỗ trợ các trường hợp biên: "", "../x", "/abs", root "/"
 */
export function normalizePath(p: string): string {
    if (p === '') return '';
    const normalized = p.replace(/\\/g, "/");
    const isAbsolute = normalized.startsWith("/");

    const segments = normalized.split("/");
    const parts: string[] = [];

    for (const part of segments) {
        if (part === "" || part === ".") continue;
        if (part === "..") {
            const top = parts[parts.length - 1];
            if (top !== undefined && top !== "..") parts.pop();
            else if (!isAbsolute) {
                parts.push("..")
            }
        } else {
            parts.push(part);
        }
    }

    if (isAbsolute) {
        return `/${parts.join('/')}`;
    }

    return parts.join('/');
}

export interface PackOptions {
    debug?: boolean | undefined;
}

export async function packProject(
    inputDir: string,
    outputDir: string,
    runtimeCode: string,
    networks: string = 'generic',
    options?: PackOptions
): Promise<string[]> {
    const vfs = await loadInput(inputDir);
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
            const baseDir = path.posix.dirname(scanResult.configs.importMap);
            const resolvePath = (val: string) => {
                const normalized = path.posix.normalize(path.posix.join(baseDir, val));
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

    const adapters = networkRegistry.resolveNetworks(networks);
    // const isSingle = adapters.length === 1;
    const isExistingDir = fs.existsSync(outputDir) && fs.statSync(outputDir).isDirectory();
    const hasHtmlExt = !isExistingDir && (outputDir.endsWith('.html') || outputDir.endsWith('.htm'));

    const outputFiles: string[] = [];

    for (const adapter of adapters) {
        let targetFile: string;
        // if (isSingle) {
        //     if (hasHtmlExt) {
        //         targetFile = outputDir;
        //     } else {
        //         const fileName = adapter.id === 'generic' ? 'index.html' : `index_${adapter.id}.html`;
        //         targetFile = path.join(outputDir, fileName);
        //     }
        // } else {
        //     if (hasHtmlExt) {
        //         const dir = path.dirname(outputDir);
        //         const ext = path.extname(outputDir);
        //         const base = path.basename(outputDir, ext);
        //         targetFile = path.join(dir, `${base}_${adapter.id}${ext}`);
        //     } else {
        //         targetFile = path.join(outputDir, `index_${adapter.id}.html`);
        //     }
        // }

        targetFile = path.join(outputDir, adapter.id, `index.html`);
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

        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetFile, finalHtml, 'utf-8');
        outputFiles.push(targetFile);
    }

    return outputFiles;
}
