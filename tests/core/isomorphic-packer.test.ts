import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';
import { loadBrowserZip } from '../../src/browser/input.js';
import { packProjectCore } from '../../src/core/packer.js';
import { packProject } from '../../src/core/index.js';
import { loadInput } from '../../src/node/input.js';
import { handleBuild } from '../../src/worker/packer.worker.js';
import type { WorkerResponse } from '../../src/worker/types.js';

const root = path.resolve(__dirname, '../..');
const zipPath = path.join(root, 'fixtures/cocos-3.8-basic/web-mobile.zip');
const runtime = 'window.__pf = {};';

describe('Bài 12: Isomorphic Core & Web Worker', () => {
  let zipBytes: Uint8Array;

  beforeAll(() => {
    zipBytes = new Uint8Array(fs.readFileSync(zipPath));
  });

  describe('1. Browser Loader (loadBrowserZip)', () => {
    it('nạp zip từ Uint8Array thành VFS', async () => {
      const vfs = await loadBrowserZip(zipBytes);
      expect(vfs.has('index.html')).toBe(true);
    });

    it('nạp zip từ ArrayBuffer (giống file.arrayBuffer() trên web)', async () => {
      const ab = zipBytes.slice().buffer;
      const vfs = await loadBrowserZip(ab);
      expect(vfs.has('index.html')).toBe(true);
    });

    it('cho ra VFS giống hệt Node loader khi đọc cùng file zip', async () => {
      const fromBrowser = await loadBrowserZip(zipBytes);
      const fromNode = await loadInput(zipPath);
      expect(fromBrowser.list()).toEqual(fromNode.list());
    });
  });

  describe('2. Pure Core (packProjectCore)', () => {
    it('trả về file trong RAM theo cấu trúc <network>/index.html', async () => {
      const vfs = await loadBrowserZip(zipBytes);
      const outputs = packProjectCore(vfs, runtime, 'google,mintegral');

      expect(outputs.map((o) => o.relativePath)).toEqual([
        'google/index.html',
        'mintegral/index.html',
      ]);
      expect(outputs.every((o) => o.fileName === 'index.html')).toBe(true);
      expect(outputs[0]!.content).toContain('exitapi.js');
      expect(outputs[1]!.content).toContain('gameStart');
    });

    it('mặc định là generic khi không truyền network', async () => {
      const vfs = await loadBrowserZip(zipBytes);
      const outputs = packProjectCore(vfs, runtime);
      expect(outputs.map((o) => o.network)).toEqual(['generic']);
    });
  });

  describe('3. Node build và Core build cho kết quả giống nhau', () => {
    const outDir = path.join(root, 'output_test_iso');

    afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }));

    it('nội dung file ghi ra đĩa trùng với output trong RAM', async () => {
      // debug: true để dùng assetsMap (tất định), tránh khác biệt timestamp trong zip payload
      const [written] = await packProject(zipPath, outDir, runtime, 'google', { debug: true });
      const vfs = await loadBrowserZip(zipBytes);
      const [inMemory] = packProjectCore(vfs, runtime, 'google', { debug: true });

      expect(written).toBe(path.join(outDir, 'google', 'index.html'));
      expect(fs.readFileSync(written!, 'utf-8')).toBe(inMemory!.content);
    });
  });

  describe('4. Worker handler (handleBuild)', () => {
    it('phát PROGRESS tăng dần rồi SUCCESS kèm outputs', async () => {
      const messages: WorkerResponse[] = [];
      await handleBuild(
        { type: 'BUILD', zipBuffer: zipBytes, runtimeCode: runtime, networks: 'all' },
        (res) => messages.push(res)
      );

      const progress = messages.filter((m) => m.type === 'PROGRESS');
      const percents = progress.map((m) => (m.type === 'PROGRESS' ? m.percent : 0));
      expect(percents).toEqual([...percents].sort((a, b) => a - b));
      expect(percents.at(-1)).toBe(100);

      const last = messages.at(-1)!;
      expect(last.type).toBe('SUCCESS');
      if (last.type === 'SUCCESS') {
        expect(last.outputs).toHaveLength(4);
      }
    });

    it('trả về ERROR khi zip hỏng thay vì crash worker', async () => {
      const messages: WorkerResponse[] = [];
      await handleBuild(
        { type: 'BUILD', zipBuffer: new Uint8Array([1, 2, 3]), runtimeCode: runtime },
        (res) => messages.push(res)
      );
      expect(messages.at(-1)!.type).toBe('ERROR');
    });

    it('trả về ERROR khi network không tồn tại', async () => {
      const messages: WorkerResponse[] = [];
      await handleBuild(
        { type: 'BUILD', zipBuffer: zipBytes, runtimeCode: runtime, networks: 'tiktok' },
        (res) => messages.push(res)
      );
      const last = messages.at(-1)!;
      expect(last.type).toBe('ERROR');
      if (last.type === 'ERROR') expect(last.error).toMatch(/not found/i);
    });
  });

  describe('5. Guard: worker bundle không phụ thuộc Node.js', () => {
    it('bundle được cho platform browser và không kéo theo fs / src/node', async () => {
      const result = await esbuild.build({
        entryPoints: [path.join(root, 'src/worker/packer.worker.ts')],
        bundle: true,
        write: false,
        platform: 'browser',
        format: 'esm',
        metafile: true,
        logLevel: 'silent',
      });

      const inputs = Object.keys(result.metafile.inputs);
      expect(inputs.some((p) => p.includes('src/node/'))).toBe(false);
      expect(inputs.some((p) => p === 'src/core/index.ts')).toBe(false);

      const code = result.outputFiles[0]!.text;
      expect(code).not.toMatch(/require\(["'](node:)?fs["']\)/);
      expect(code).not.toMatch(/from ["'](node:)?fs["']/);
    });
  });
});
