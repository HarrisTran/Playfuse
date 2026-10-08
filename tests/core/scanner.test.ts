import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { loadInput } from '../../src/node/input.js';
import { scanProject } from '../../src/core/scanner/index.js';
import { VirtualFS } from '../../src/core/vfs.js';
import { InputError } from '../../src/core/input/errors.js';

describe('Scanner (Phân loại tài nguyên)', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');

  const targets = [
    {
      name: 'cocos-3.8-basic (Tắt MD5)',
      zip: path.join(fixturesDir, 'cocos-3.8-basic/web-mobile.zip'),
      settingsPattern: /^src\/settings\.json$/,
      importMapPattern: /^src\/import-map\.json$/,
    },
    {
      name: 'cocos-3.8-md5 (Bật MD5)',
      zip: path.join(fixturesDir, 'cocos-3.8-md5/web-mobile.zip'),
      settingsPattern: /^src\/settings\.[0-9a-f]+\.json$/,
      importMapPattern: /^src\/import-map\.[0-9a-f]+\.json$/,
    },
  ];

  for (const target of targets) {
    it(`phân loại chính xác 100% file trong fixture ${target.name}`, async () => {
      const vfs = await loadInput(target.zip);
      const scanned = scanProject(vfs);

      // 1. HTML
      expect(scanned.html).toBe('index.html');

      // 2. CSS
      expect(scanned.stylesheets.length).toBeGreaterThan(0);
      expect(scanned.stylesheets.some((f) => /^style(\.[0-9a-f]+)?\.css$/.test(f))).toBe(true);

      // 3. Configs
      expect(scanned.configs.settings).toBeDefined();
      expect(scanned.configs.settings).toMatch(target.settingsPattern);

      if (scanned.configs.importMap) {
        expect(scanned.configs.importMap).toMatch(target.importMapPattern);
      }

      // 4. Engine Scripts
      expect(scanned.engineScripts.some((f) => f.includes('polyfills'))).toBe(true);
      expect(scanned.engineScripts.some((f) => f.includes('system.bundle'))).toBe(true);

      // 5. Game Scripts
      expect(scanned.gameScripts.some((f) => f.startsWith('index'))).toBe(true);
      expect(scanned.gameScripts.some((f) => f.startsWith('application'))).toBe(true);
      expect(scanned.gameScripts.some((f) => f.includes('cocos-js/cc'))).toBe(true);

      // 6. Assets
      // Phải chứa ảnh, âm thanh mp3, effect.bin và các json trong assets/
      expect(scanned.assets.some((f) => f.endsWith('.mp3'))).toBe(true);
      expect(scanned.assets.some((f) => f.endsWith('.png'))).toBe(true);
      expect(scanned.assets.some((f) => f.endsWith('.ttf'))).toBe(true);
      expect(scanned.assets.some((f) => f.includes('assets/'))).toBe(true);

      // Tổng số file được phân loại phải bằng CHÍNH XÁC tổng số file của VFS (Không sót, không trùng)
      const configFiles = [scanned.configs.settings, scanned.configs.importMap].filter(
        (f): f is string => typeof f === 'string'
      );

      const allCategorizedFiles = [
        scanned.html,
        ...scanned.stylesheets,
        ...scanned.engineScripts,
        ...scanned.gameScripts,
        ...configFiles,
        ...scanned.assets,
      ];

      expect(new Set(allCategorizedFiles).size).toBe(allCategorizedFiles.length); // Không có file nào trùng
      expect(allCategorizedFiles.length).toBe(vfs.fileCount); // Phân loại đủ 100%
    });
  }

  describe('Validation & Edge Cases', () => {
    it('báo lỗi nếu thiếu index.html', () => {
      const vfs = VirtualFS.fromEntries([['src/settings.json', new Uint8Array([1])]]);
      expect(() => scanProject(vfs)).toThrowError(InputError);
    });

    it('báo lỗi nếu thiếu settings.json', () => {
      const vfs = VirtualFS.fromEntries([['index.html', new Uint8Array([1])]]);
      expect(() => scanProject(vfs)).toThrowError(InputError);
    });
  });
});
