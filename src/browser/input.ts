import { vfsFromZip } from "../core/input/unzip.js";
import type { VirtualFS } from "../core/vfs.js";

export function loadBrowserZip(buffer: ArrayBuffer | Uint8Array): Promise<VirtualFS> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return vfsFromZip(bytes);
}