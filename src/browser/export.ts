import { zipSync } from 'fflate';
import type { PlayableOutputFile } from '../core/packer.js';

export function createZipBundle(files: PlayableOutputFile[]): Uint8Array {
    const zipData: Record<string, Uint8Array> = {};
    for (const file of files) {
        zipData[file.relativePath] = new TextEncoder().encode(file.content);
    }
    return zipSync(zipData);
}

export function downloadBlob(data: string | Uint8Array, filename: string, mimeType: string = 'application/octet-stream'): void {
    const part: BlobPart = typeof data === 'string' ? data : (data.slice().buffer as ArrayBuffer);
    const blob = new Blob([part], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
