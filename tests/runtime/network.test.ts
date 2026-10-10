// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { injectNetworkHooks } from '../../src/runtime/network.js';

describe('Network Hooks (Monkey-patch fetch & XHR)', () => {
  const mockAssetsMap: Record<string, string> = {
    'assets/main/index.js': 'data:application/javascript;base64,Y29uc29sZS5sb2coImhlbGxvIik7', // console.log("hello");
    'src/settings.json': 'data:application/json;base64,eyJrZXkiOiAidmFsdWUifQ==', // {"key": "value"}
  };
  const baseUrl = 'http://localhost:3000/';

  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    // Giả lập original fetch để có thể kiểm tra xem nó có được gọi hay không
    window.fetch = vi.fn().mockResolvedValue(new Response('original-fetch-mock'));
    
    // Bắt đầu tiêm móc (Hook)
    injectNetworkHooks(mockAssetsMap, baseUrl);
  });

  afterEach(() => {
    // Khôi phục lại trạng thái ban đầu sau mỗi test
    window.fetch = originalFetch;
  });

  describe('1. Hook window.fetch', () => {
    it('chặn URL có trong từ điển và trả về nội dung Blob giả lập 200', async () => {
      // Game gọi fetch tới server ảo
      const response = await window.fetch('http://localhost:3000/assets/main/index.js');
      
      expect(response.status).toBe(200);
      
      // Đọc nội dung bị chặn và đã được chuyển đổi ngược từ Base64
      const text = await response.text();
      expect(text).toBe('console.log("hello");');
    });

    it('bỏ qua và nhường quyền cho fetch gốc nếu URL ngoại lai (external)', async () => {
      const externalUrl = 'https://google.com/analytics.js';
      const response = await window.fetch(externalUrl);
      
      // Nội dung phải trùng với original-fetch-mock (nghĩa là nó đã trượt qua Hook)
      const text = await response.text();
      expect(text).toBe('original-fetch-mock');
    });
    
    it('hỗ trợ đối số đầu vào là đối tượng Request (không chỉ là string)', async () => {
      const req = new Request('http://localhost:3000/src/settings.json');
      const response = await window.fetch(req);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.key).toBe('value'); // Trùng khớp với đoạn JSON {"key": "value"}
    });
  });

  describe('2. Hook window.XMLHttpRequest', () => {
    it('chặn URL trong từ điển và trả về chuỗi khi responseType là text hoặc rỗng', () => {
      return new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:3000/assets/main/index.js');
        xhr.responseType = 'text'; // Cocos thường dùng text cho script
        xhr.onload = () => {
          expect(xhr.status).toBe(200);
          expect(xhr.readyState).toBe(4); // DONE
          expect(xhr.response).toBe('console.log("hello");');
          expect(xhr.responseText).toBe('console.log("hello");');
          resolve();
        };
        xhr.send();
      });
    });

    it('chặn URL trong từ điển và trả về object nếu responseType = json', () => {
      return new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:3000/src/settings.json');
        xhr.responseType = 'json';
        xhr.onload = () => {
          expect(xhr.status).toBe(200);
          expect(xhr.response).toEqual({ key: 'value' });
          resolve();
        };
        xhr.send();
      });
    });

    it('chặn URL và trả về ArrayBuffer nếu responseType = arraybuffer', () => {
      return new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:3000/src/settings.json');
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          expect(xhr.status).toBe(200);
          expect(xhr.response instanceof ArrayBuffer).toBe(true);
          resolve();
        };
        xhr.send();
      });
    });

    it('bỏ qua và dùng XHR gốc nếu URL là ngoại lai (external)', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://google.com/test.json');
      
      let called = false;
      xhr.onload = () => { called = true; };
      
      // Vì XHR không bị chặn, nó sẽ tiến hành request thật.
      // Dấu hiệu là send không gọi onload đồng bộ ngay lập tức như Hook của chúng ta.
      xhr.send();
      expect(called).toBe(false); 
    });
  });
});
