import { unzipSync } from 'fflate';
import { VirtualFS } from '../vfs.js';
import { InputError } from './errors.js';
import { isJunkPath } from './junk.js';
import { detectRoot } from './root.js';

export async function vfsFromZip(_bytes: Uint8Array): Promise<VirtualFS> {
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(_bytes);
  }
  catch {
    throw new InputError('INVALID_ZIP', 'Không thể giải nén file zip');
  }

  return await Promise.resolve(buildVfs(unzipped));
}

export function buildVfs(entries: Readonly<Record<string, Uint8Array>>): VirtualFS {
  const cleanPaths: Array<[string, Uint8Array]> = [];
  for (const [path, data] of Object.entries(entries)) {
    if (isJunkPath(path)) continue;
    if (path.endsWith('/')) continue;
    cleanPaths.push([path, data]);
  }

  const rootPrefix = detectRoot(cleanPaths.map(([path]) => path));
  // remove prefix
  const normalizedEntires: Array<[string, Uint8Array]> = [];
  for (const [path, data] of cleanPaths) {
    const relativePath = path.slice(rootPrefix.length);
    normalizedEntires.push([relativePath, data]);
  };
  return VirtualFS.fromEntries(normalizedEntires);
}
