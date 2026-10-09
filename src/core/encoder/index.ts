import type { VirtualFS } from "../vfs.js";

export function getMimeType(filePath: string): string {
    const dotIndex = filePath.lastIndexOf('.');
    if (dotIndex == -1) return 'application/octet-stream';
    const extPath = filePath.slice(dotIndex).toLowerCase();
    switch (extPath) {
        case '.js':
            return 'application/javascript';
        case '.json':
            return 'application/json';
        case '.css':
            return 'text/css';
        case '.html':
            return 'text/html';
        case '.wasm':
            return 'application/wasm';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.svg':
            return 'image/svg+xml';
        case '.mp3':
            return 'audio/mpeg';
        case '.ogg':
            return 'audio/ogg';
        case '.wav':
            return 'audio/wav';
        case '.mp4':
            return 'video/mp4';
        case '.webm':
            return 'video/webm';
        case '.plist':
            return 'application/xml';
        case '.txt':
            return 'text/plain';
        case '.ttf':
            return 'font/ttf';
        default:
            return 'application/octet-stream';
    }
}

export function encodeAssetToDataURI(vfs: VirtualFS, filePath: string): string {
    const mime = getMimeType(filePath);
    const bytes = vfs.get(filePath);
    if (!bytes) {
        throw new Error(`File ${filePath} not found`);
    }
    const base64 = uint8ArrayToBase64(bytes);
    return `data:${mime};base64,${base64}`;
}

export function buildAssetsMap(vfs: VirtualFS, assets: string[]): Record<string, string> {
    const assetsMap: Record<string, string> = {};
    for (const assetPath of assets) {
        assetsMap[assetPath] = encodeAssetToDataURI(vfs, assetPath);
    }
    return assetsMap;
}


function uint8ArrayToBase64(bytes: Uint8Array): string {
    const CHUNK = 0x8000; // 32768
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(
            null,
            bytes.subarray(i, i + CHUNK) as unknown as number[]
        );
    }
    return btoa(binary);
}

