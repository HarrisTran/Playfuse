import { describe, expect, it } from 'vitest';
import { networkRegistry } from '../../src/core/adapters/registry.js';
import type { AdNetworkAdapter } from '../../src/core/adapters/types.js';
import '../../src/core/adapters/ads_network/generic.js'; // Ensure generic adapter is loaded
import { injectHTML } from '../../src/core/injector/index.js';

describe('Module 5 - Bài 10: Ad Network Adapters & Strategy Pattern', () => {
  describe('1. NetworkRegistry', () => {
    it('đăng ký và lấy ra adapter thành công', () => {
      const mockAdapter: AdNetworkAdapter = {
        id: 'mock-network',
        name: 'Mock Ad Network',
        wrapCTA: () => '<script>// mock cta</script>',
      };

      networkRegistry.register(mockAdapter);
      expect(networkRegistry.has('mock-network')).toBe(true);

      const retrieved = networkRegistry.get('mock-network');
      expect(retrieved).toBe(mockAdapter);
      expect(retrieved.id).toBe('mock-network');
      expect(retrieved.name).toBe('Mock Ad Network');
    });

    it('tìm kiếm adapter không phân biệt hoa thường (case-insensitive)', () => {
      expect(networkRegistry.has('GENERIC')).toBe(true);
      expect(networkRegistry.has('Generic')).toBe(true);
      expect(networkRegistry.has('generic')).toBe(true);

      const adapter = networkRegistry.get('GeNeRiC');
      expect(adapter).toBeDefined();
      expect(adapter.id).toBe('generic');
    });

    it('ném lỗi rõ ràng khi lấy adapter không tồn tại', () => {
      expect(() => networkRegistry.get('non-existent-network')).toThrowError(
        /not found/i
      );
    });

    it('liệt kê được danh sách tất cả các adapter đã đăng ký', () => {
      const list = networkRegistry.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      expect(list.some((a) => a.id === 'generic')).toBe(true);
    });
  });

  describe('2. GenericAdapter', () => {
    const generic = networkRegistry.get('generic');

    it('có id và name đúng tiêu chuẩn', () => {
      expect(generic.id).toBe('generic');
      expect(generic.name).toBe('Generic / Web Preview');
    });

    it('wrapCTA sinh ra thẻ <script> định nghĩa window.installClick', () => {
      const script = generic.wrapCTA();
      expect(script).toContain('<script>');
      expect(script).toContain('window.installClick');
      expect(script).toContain('</script>');
    });

    it('wrapCTA xử lý an toàn storeUrl không gây lỗi cú pháp JavaScript (SyntaxError)', () => {
      const storeUrl = 'https://apps.apple.com/app/id123456';
      const script = generic.wrapCTA(storeUrl);

      // Trích xuất phần JavaScript bên trong <script>...</script>
      const match = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      expect(match).toBeTruthy();
      const jsCode = match![1];

      // Đảm bảo mã JavaScript hợp lệ về mặt cú pháp (không bị Uncaught SyntaxError: Unexpected token ':')
      expect(() => new Function(jsCode)).not.toThrow();
    });

    it('wrapCTA hoạt động an toàn khi không truyền storeUrl', () => {
      const script = generic.wrapCTA();
      const match = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      expect(match).toBeTruthy();
      const jsCode = match![1];

      expect(() => new Function(jsCode)).not.toThrow();
    });
  });

  describe('3. Tích hợp Adapter vào HTML Injector', () => {
    it('tiêm injectHead vào <head> và wrapCTA, injectBody vào trước </body>', () => {
      const customAdapter: AdNetworkAdapter = {
        id: 'test-ad-network',
        name: 'Test Ad Network',
        injectHead: () => '<meta name="ad-network" content="test-sdk">',
        injectBody: () => '<div id="test-sdk-overlay"></div>',
        wrapCTA: () => '<script>window.installClick = function(){};</script>',
      };

      const result = injectHTML({
        htmlContent: '<html><head></head><body><div id="game"></div></body></html>',
        styles: [],
        engineScripts: [],
        gameScripts: [],
        assetsMap: {},
        runtimeCode: '',
        importMapContent: '{}',
        adapter: customAdapter,
      });

      // 1. Phải có nội dung từ injectHead trong thẻ <head>
      expect(result).toContain('<meta name="ad-network" content="test-sdk">');
      expect(result).toMatch(/<meta name="ad-network" content="test-sdk"><\/head>/);

      // 2. Phải có nội dung từ injectBody và wrapCTA trước </body>
      expect(result).toContain('<div id="test-sdk-overlay"></div>');
      expect(result).toContain('window.installClick = function(){};');
      expect(result).toMatch(/<div id="test-sdk-overlay"><\/div><script>window\.installClick = function\(\){};<\/script><\/body>/);
    });

    it('vẫn hoạt động bình thường khi không truyền adapter', () => {
      const result = injectHTML({
        htmlContent: '<html><head></head><body></body></html>',
        styles: [],
        engineScripts: [],
        gameScripts: [],
        assetsMap: {},
        runtimeCode: '',
        importMapContent: '{}',
      });

      expect(result).toContain('<html>');
      expect(result).toContain('</body>');
    });
  });
});
