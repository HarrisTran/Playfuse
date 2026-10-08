import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { loadInput } from '../../src/node/input.js';

describe('Node Input Loader (Fixture Equivalence Test)', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');

  const fixtureTargets = [
    {
      name: 'cocos-3.8-basic',
      folder: path.join(fixturesDir, 'cocos-3.8-basic/web-mobile'),
      zip: path.join(fixturesDir, 'cocos-3.8-basic/web-mobile.zip'),
    },
    {
      name: 'cocos-3.8-md5',
      folder: path.join(fixturesDir, 'cocos-3.8-md5/web-mobile'),
      zip: path.join(fixturesDir, 'cocos-3.8-md5/web-mobile.zip'),
    },
  ];

  for (const target of fixtureTargets) {
    it(`so khớp VFS giữa folder và zip của ${target.name}`, async () => {
      const startFolder = performance.now();
      const vfsFromFolder = await loadInput(target.folder);
      const timeFolder = performance.now() - startFolder;

      const startZip = performance.now();
      const vfsFromZip = await loadInput(target.zip);
      const timeZip = performance.now() - startZip;

      // Benchmark phải dưới 500ms
      expect(timeFolder).toBeLessThan(500);
      expect(timeZip).toBeLessThan(500);

      // Danh sách file phải giống hệt nhau
      const filesFromFolder = vfsFromFolder.list();
      const filesFromZip = vfsFromZip.list();
      expect(filesFromFolder).toEqual(filesFromZip);

      // Nội dung từng file phải khớp 100%
      for (const filePath of filesFromFolder) {
        const data1 = vfsFromFolder.get(filePath);
        const data2 = vfsFromZip.get(filePath);
        expect(data1).toBeDefined();
        expect(data2).toBeDefined();
        expect(data1?.byteLength).toBe(data2?.byteLength);
        expect(data1).toEqual(data2);
      }

      // Đảm bảo không chứa rác
      expect(filesFromFolder.some((f) => f.includes('.DS_Store'))).toBe(false);
      expect(filesFromFolder.some((f) => f.includes('__MACOSX'))).toBe(false);
      expect(vfsFromFolder.has('index.html')).toBe(true);
    });
  }
});
