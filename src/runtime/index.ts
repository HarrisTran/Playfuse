import { injectNetworkHooks } from "./network.js";
import { unzipSync } from "fflate";

let initialized = false;

function getMimeType(filePath: string): string {
    const dotIndex = filePath.lastIndexOf('.');
    if (dotIndex === -1) return 'application/octet-stream';
    const ext = filePath.slice(dotIndex).toLowerCase();
    switch (ext) {
        case '.js': return 'application/javascript';
        case '.json': return 'application/json';
        case '.css': return 'text/css';
        case '.html': return 'text/html';
        case '.wasm': return 'application/wasm';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.svg': return 'image/svg+xml';
        case '.mp3': return 'audio/mpeg';
        case '.ogg': return 'audio/ogg';
        case '.wav': return 'audio/wav';
        case '.mp4': return 'video/mp4';
        case '.webm': return 'video/webm';
        case '.plist': return 'application/xml';
        case '.txt': return 'text/plain';
        case '.ttf': return 'font/ttf';
        default: return 'application/octet-stream';
    }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    const CHUNK = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
    }
    return btoa(binary);
}

export function unpackZip(zipBase64: string): Record<string, string> {
    const binStr = atob(zipBase64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }
    const unzipped = unzipSync(bytes);
    const assetsMap: Record<string, string> = {};
    for (const p in unzipped) {
        const fileBytes = unzipped[p]!;
        const mime = getMimeType(p);
        assetsMap[p] = `data:${mime};base64,${uint8ArrayToBase64(fileBytes)}`;
    }
    return assetsMap;
}

export function init(assets: Record<string, string> | string) {
    if (initialized) return;
    initialized = true;
    const baseUrl = typeof location !== 'undefined' ? location.href : '';
    const assetsMap = typeof assets === 'string' ? unpackZip(assets) : assets;
    injectNetworkHooks(assetsMap, baseUrl);
}

// Fallback for debug mode or direct window execution
if (typeof window !== 'undefined' && (window as any).__assetsMap__) {
    init((window as any).__assetsMap__);
}