import { describe, expect, it } from 'vitest';
import { injectHTML } from '../../src/core/injector/index.js';

describe('HTML Injector', () => {
  it('xoá bỏ các thẻ <script src="..."> và <link rel="stylesheet"> cũ để tránh gọi file vật lý', () => {
    const rawHTML = `
      <html>
        <head>
          <link rel="stylesheet" href="style.css">
        </head>
        <body>
          <script src="main.js"></script>
        </body>
      </html>
    `;
    
    const result = injectHTML({
      htmlContent: rawHTML,
      styles: [],
      engineScripts: [],
      gameScripts: [],
      assetsMap: {},
      runtimeCode: ''
    });

    expect(result).not.toContain('<link rel="stylesheet" href="style.css">');
    expect(result).not.toContain('<script src="main.js">');
    expect(result).toContain('<html>'); // Vẫn giữ lại cấu trúc chính
  });

  it('nhúng CSS vào trước thẻ </head>', () => {
    const result = injectHTML({
      htmlContent: '<html><head></head><body></body></html>',
      styles: ['body { color: red; }', 'div { padding: 0; }'],
      engineScripts: [],
      gameScripts: [],
      assetsMap: {},
      runtimeCode: ''
    });

    expect(result).toContain('<style>body { color: red; }div { padding: 0; }</style></head>');
  });

  it('nhúng từ điển assetsMap, runtimeCode và các script vào trước thẻ </body>', () => {
    const result = injectHTML({
      htmlContent: '<html><head></head><body></body></html>',
      styles: [],
      engineScripts: ['console.log("engine");'],
      gameScripts: ['console.log("game");'],
      assetsMap: { 'test.png': 'data:image/png;base64,123' },
      runtimeCode: 'console.log("runtime");'
    });

    // 1. Phải có từ điển assetsMap được serialize
    expect(result).toContain('window.__assetsMap__ = {"test.png":"data:image/png;base64,123"};');
    
    // 2. Phải có runtime hook
    expect(result).toContain('console.log("runtime");');
    
    // 3. Phải có engine và game scripts
    expect(result).toContain('<script>console.log("engine");</script>');
    expect(result).toContain('<script>console.log("game");</script>');
    
    // 4. Phải nằm trước thẻ đóng body
    expect(result).toMatch(/<\/script>\s*<\/body>/);
  });
});
