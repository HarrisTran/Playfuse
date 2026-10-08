import { normalizePath } from "./index.js";
import { InputError } from "./input/errors.js";

export class VirtualFS implements Iterable<[path: string, data: Uint8Array]> {
    private readonly files: Map<string, Uint8Array> = new Map();
    static fromEntries(entries: Iterable<readonly [string, Uint8Array]>): VirtualFS {
        const vfs = new VirtualFS();
        for (const [rawPath, data] of entries) {
            const p = normalizePath(rawPath);
            if (vfs.files.has(p)) {
                throw new InputError('DUPLICATE_ENTRY', `Duplicate path: ${p}`);
            }
            if (p.startsWith('../')) {
                throw new InputError('UNSAFE_PATH', `Unsafe path: ${p}`);
            }
            vfs.files.set(p, data);
        }
        return vfs;
    }
    has(path: string): boolean {
        const normalized = normalizePath(path);
        return this.files.has(normalized);
    }
    get(path: string): Uint8Array | undefined {
        const normalized = normalizePath(path);
        if (this.has(normalized)) {
            return this.files.get(normalized);
        }
        return undefined;
    }
    readText(path: string): string | undefined {
        const data = this.get(path);
        if(data === undefined) return undefined;
        return new TextDecoder().decode(data);
    }
    list(): readonly string[] {
        return Array.from(this.files.keys()).sort();
    }
    get fileCount(): number {
        return this.files.size;
    }
    get totalBytes(): number {
        let totalBytes = 0;
        for (const data of this.files.values()) {
            totalBytes += data.byteLength;
        }
        return totalBytes;
    }
    [Symbol.iterator](): Iterator<[string, Uint8Array]> {
        return this.files.entries();
    }
}
