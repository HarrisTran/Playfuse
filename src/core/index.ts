import { loadInput } from "../node/input.js";
import { buildAssetsMap } from "./encoder/index.js";
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

    for(const part of segments) {
        if(part === "" || part === ".") continue;
        if(part === "..") {
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

export async function packProject(inputDir: string, outputDir: string, runtimeCode: string): Promise<string> {
    const vfs = await loadInput(inputDir);
    const scanResult = scanProject(vfs);
    
    const assetFiles = [
        ...(scanResult.assets as string[]),
        ...(scanResult.configs.settings ? [scanResult.configs.settings] : []),
        ...(scanResult.configs.importMap ? [scanResult.configs.importMap] : []),
    ];
    const assetsMap = buildAssetsMap(vfs, assetFiles);
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
            const basePath = scanResult.configs.importMap.substring(0, scanResult.configs.importMap.lastIndexOf('/') + 1);
            
            const resolvePath = (val: string) => {
                if (val.startsWith('./')) val = val.substring(2);
                const parts = basePath.split('/').filter(Boolean);
                const valParts = val.split('/');
                for (const p of valParts) {
                    if (p === '..') parts.pop();
                    else if (p !== '.') parts.push(p);
                }
                return './' + parts.join('/');
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

    const finalHtml = injectHTML({
        htmlContent: htmlContent,
        styles: styles,
        engineScripts: engineScripts,
        gameScripts: gameScripts,
        assetsMap: assetsMap,
        runtimeCode: runtimeCode,
        importMapContent: importMapContent,
    });

    let targetFile = outputDir;
    if ((fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) || !path.extname(targetFile)) {
        targetFile = path.join(targetFile, 'index.html');
    }

    fs.writeFileSync(targetFile, finalHtml, 'utf-8');
    return targetFile;
}
