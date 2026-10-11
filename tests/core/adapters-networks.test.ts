import { describe, expect, it } from 'vitest';
import { networkRegistry } from '../../src/core/adapters/index.js';
import { injectHTML } from '../../src/core/injector/index.js';

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
      expect(() => new Function(match![1])).not.toThrow();
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
      expect(() => new Function(match![1])).not.toThrow();
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
      expect(() => new Function(match![1])).not.toThrow();
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
});
