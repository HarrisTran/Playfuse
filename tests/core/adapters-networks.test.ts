import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { networkRegistry } from '../../src/core/adapters/index.js';
import { injectHTML } from '../../src/core/injector/index.js';
import { packProject } from '../../src/core/index.js';
import fs from 'fs';
import path from 'path';

describe('Module 5 - Bài 11: Hiện Thực Adapter Từng Mạng & Batch Build', () => {
  describe('1. Đăng ký đầy đủ các Ad Networks trong Registry', () => {
    it('chứa đầy đủ generic, applovin, google, mintegral', () => {
      expect(networkRegistry.has('generic')).toBe(true);
      expect(networkRegistry.has('applovin')).toBe(true);
      expect(networkRegistry.has('google')).toBe(true);
      expect(networkRegistry.has('mintegral')).toBe(true);
    });
  });

  describe('2. AppLovinAdapter (MRAID)', () => {
    it('tuân thủ tiêu chuẩn kỹ thuật của AppLovin', () => {
      const adapter = networkRegistry.get('applovin');
      expect(adapter.id).toBe('applovin');

      // injectHead phải chứa thẻ script mraid.js
      const head = adapter.injectHead?.() || '';
      expect(head).toContain('mraid.js');

      // wrapCTA phải gọi mraid.open
      const cta = adapter.wrapCTA('https://example.com/app');
      expect(cta).toContain('mraid.open');
      expect(cta).toContain('window.installClick');

      // Đảm bảo không lỗi cú pháp JavaScript
      const match = cta.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      expect(match).toBeTruthy();
      expect(() => new Function(match![1] ?? '')).not.toThrow();
    });

    it('tiêm đúng vào HTML qua injectHTML', () => {
      const adapter = networkRegistry.get('applovin');
      const html = injectHTML({
        htmlContent: '<html><head></head><body></body></html>',
        styles: [],
        engineScripts: [],
        gameScripts: [],
        assetsMap: {},
        runtimeCode: '',
        importMapContent: '{}',
        adapter: adapter,
      });

      expect(html).toContain('mraid.js');
      expect(html).toContain('mraid.open');
    });
  });

  describe('3. GoogleAdapter (ExitApi)', () => {
    it('tuân thủ tiêu chuẩn kỹ thuật của Google Ads', () => {
      const adapter = networkRegistry.get('google');
      expect(adapter.id).toBe('google');

      // injectHead phải chứa meta ad.size và exitapi.js
      const head = adapter.injectHead?.() || '';
      expect(head).toContain('exitapi.js');
      expect(head).toContain('ad.size');

      // wrapCTA phải gọi ExitApi.exit
      const cta = adapter.wrapCTA('https://example.com/app');
      expect(cta).toContain('ExitApi.exit');
      expect(cta).toContain('window.installClick');

      // Đảm bảo không lỗi cú pháp JavaScript
      const match = cta.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      expect(match).toBeTruthy();
      expect(() => new Function(match![1] ?? '')).not.toThrow();
    });

    it('tiêm đúng vào HTML qua injectHTML', () => {
      const adapter = networkRegistry.get('google');
      const html = injectHTML({
        htmlContent: '<html><head></head><body></body></html>',
        styles: [],
        engineScripts: [],
        gameScripts: [],
        assetsMap: {},
        runtimeCode: '',
        importMapContent: '{}',
        adapter: adapter,
      });

      expect(html).toContain('exitapi.js');
      expect(html).toContain('ExitApi.exit');
    });
  });

  describe('4. MintegralAdapter', () => {
    it('tuân thủ tiêu chuẩn kỹ thuật của Mintegral', () => {
      const adapter = networkRegistry.get('mintegral');
      expect(adapter.id).toBe('mintegral');

      // injectBody phải định nghĩa window.gameStart và window.gameClose
      const body = adapter.injectBody?.() || '';
      expect(body).toContain('gameStart');
      expect(body).toContain('gameClose');

      // wrapCTA phải gọi window.install
      const cta = adapter.wrapCTA('https://example.com/app');
      expect(cta).toContain('window.install');
      expect(cta).toContain('window.installClick');

      // Đảm bảo không lỗi cú pháp JavaScript
      const match = cta.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      expect(match).toBeTruthy();
      expect(() => new Function(match![1] ?? '')).not.toThrow();
    });

    it('tiêm đúng vào HTML qua injectHTML', () => {
      const adapter = networkRegistry.get('mintegral');
      const html = injectHTML({
        htmlContent: '<html><head></head><body></body></html>',
        styles: [],
        engineScripts: [],
        gameScripts: [],
        assetsMap: {},
        runtimeCode: '',
        importMapContent: '{}',
        adapter: adapter,
      });

      expect(html).toContain('gameStart');
      expect(html).toContain('window.install');
    });
  });

  describe('5. resolveNetworks (Multi-Network via comma-separated string)', () => {
    it('mặc định trả về [generic] khi không truyền hoặc truyền chuỗi rỗng', () => {
      expect(networkRegistry.resolveNetworks().map((a) => a.id)).toEqual(['generic']);
      expect(networkRegistry.resolveNetworks('').map((a) => a.id)).toEqual(['generic']);
      expect(networkRegistry.resolveNetworks('   ').map((a) => a.id)).toEqual(['generic']);
    });

    it('phân giải một network đơn lẻ dạng chuỗi', () => {
      const resolved = networkRegistry.resolveNetworks('google');
      expect(resolved.map((a) => a.id)).toEqual(['google']);
    });

    it('phân giải chuỗi phân cách dấu phẩy (google,mintegral)', () => {
      const resolved = networkRegistry.resolveNetworks('google,mintegral');
      expect(resolved.map((a) => a.id)).toEqual(['google', 'mintegral']);
    });

    it('loại bỏ phần tử trùng lặp và xử lý khoảng trắng (google, google, mintegral)', () => {
      const resolved = networkRegistry.resolveNetworks('google, google, mintegral');
      expect(resolved.map((a) => a.id)).toEqual(['google', 'mintegral']);
    });

    it('trả về tất cả adapter khi truyền "all"', () => {
      const resolved = networkRegistry.resolveNetworks('all');
      const ids = resolved.map((a) => a.id);
      expect(ids).toContain('generic');
      expect(ids).toContain('applovin');
      expect(ids).toContain('google');
      expect(ids).toContain('mintegral');
    });

    it('báo lỗi rõ ràng khi truyền adapter không tồn tại', () => {
      expect(() => networkRegistry.resolveNetworks('invalid_network')).toThrowError(/not found/i);
    });
  });

  describe('6. Batch Build với packProject', () => {
    const fixtureDir = path.resolve(__dirname, '../../fixtures/cocos-3.8-basic/web-mobile');
    const testOutputDir = path.resolve(__dirname, '../../output_test_batch');
    const dummyRuntime = 'window.__pf = { loadZip: function() {} };';

    beforeAll(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    it('build mặc định (generic) tạo index.html', async () => {
      const outputDir = path.join(testOutputDir, 'single_default');
      const files = await packProject(fixtureDir, outputDir, dummyRuntime);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('index.html');
      expect(fs.existsSync(files[0]!)).toBe(true);
    });

    it('build chỉ google tạo index_google.html', async () => {
      const outputDir = path.join(testOutputDir, 'single_google');
      const files = await packProject(fixtureDir, outputDir, dummyRuntime, 'google');
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('index_google.html');
      const content = fs.readFileSync(files[0]!, 'utf-8');
      expect(content).toContain('exitapi.js');
      expect(content).toContain('ExitApi.exit');
    });

    it('build nhiều network (google,mintegral) tạo đúng các file tương ứng', async () => {
      const outputDir = path.join(testOutputDir, 'multi_selective');
      const files = await packProject(fixtureDir, outputDir, dummyRuntime, 'google,mintegral');
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.endsWith('index_google.html'))).toBe(true);
      expect(files.some((f) => f.endsWith('index_mintegral.html'))).toBe(true);

      const googleContent = fs.readFileSync(files.find((f) => f.endsWith('index_google.html'))!, 'utf-8');
      expect(googleContent).toContain('exitapi.js');

      const mintegralContent = fs.readFileSync(files.find((f) => f.endsWith('index_mintegral.html'))!, 'utf-8');
      expect(mintegralContent).toContain('gameStart');
      expect(mintegralContent).toContain('window.install');
    });

    it('build all tạo đủ cả 4 file HTML với SDK tương ứng', async () => {
      const outputDir = path.join(testOutputDir, 'batch_all');
      const files = await packProject(fixtureDir, outputDir, dummyRuntime, 'all');
      expect(files).toHaveLength(4);

      const fileNames = files.map((f) => path.basename(f));
      expect(fileNames).toContain('index_generic.html');
      expect(fileNames).toContain('index_applovin.html');
      expect(fileNames).toContain('index_google.html');
      expect(fileNames).toContain('index_mintegral.html');

      // Kiểm tra nội dung SDK của từng file
      const applovinFile = files.find((f) => f.endsWith('index_applovin.html'))!;
      expect(fs.readFileSync(applovinFile, 'utf-8')).toContain('mraid.js');

      const googleFile = files.find((f) => f.endsWith('index_google.html'))!;
      expect(fs.readFileSync(googleFile, 'utf-8')).toContain('exitapi.js');

      const mintegralFile = files.find((f) => f.endsWith('index_mintegral.html'))!;
      expect(fs.readFileSync(mintegralFile, 'utf-8')).toContain('gameStart');

      const genericFile = files.find((f) => f.endsWith('index_generic.html'))!;
      expect(fs.readFileSync(genericFile, 'utf-8')).toContain('window.open');
    });
  });
});
