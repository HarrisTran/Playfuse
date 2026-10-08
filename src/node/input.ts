import { vfsFromZip, buildVfs } from '../core/input/unzip.js';
import type { VirtualFS } from '../core/vfs.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadInput(_inputPath: string): Promise<VirtualFS> {
  const isZipFile = path.extname(_inputPath) === '.zip';
  if (isZipFile) {
    const buf = await fs.readFile(_inputPath);
    return vfsFromZip(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  }
  else {
    const entries = await fs.readdir(_inputPath, { recursive: true, withFileTypes: true });

    const fileEntries = entries.filter(e => e.isFile()).map(async (file) => {
      const fullPath = path.join(file.parentPath, file.name);
      const relPath = path.relative(_inputPath, fullPath);
      const buf = await fs.readFile(fullPath);

      return [relPath, new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)] as const;
    });

    return buildVfs(Object.fromEntries(await Promise.all(fileEntries)));
  }
}
