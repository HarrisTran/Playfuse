import { describe, expect, it } from 'vitest';
import { resolveVirtualPath } from '../../src/runtime/path.js';

describe('Runtime Path Resolver', () => {
  it('giữ nguyên đường dẫn chuẩn (đã chuẩn hoá)', () => {
    expect(resolveVirtualPath('assets/main/index.js')).toBe('assets/main/index.js');
    expect(resolveVirtualPath('src/settings.json')).toBe('src/settings.json');
  });

  it('xóa bỏ các tiền tố tương đối (./)', () => {
    expect(resolveVirtualPath('./assets/main/index.js')).toBe('assets/main/index.js');
    expect(resolveVirtualPath('./src/settings.json')).toBe('src/settings.json');
  });

  it('xóa bỏ query string và hash', () => {
    expect(resolveVirtualPath('assets/main/index.js?v=1.0')).toBe('assets/main/index.js');
    expect(resolveVirtualPath('assets/main/index.js#top')).toBe('assets/main/index.js');
    expect(resolveVirtualPath('./assets/main/index.js?v=1.2#section')).toBe('assets/main/index.js');
  });

  it('xử lý URL tuyệt đối (trích xuất path tương đối)', () => {
    // Lưu ý: baseUrl mặc định khi chạy trong browser có thể là location.href (giả lập http://localhost)
    const baseUrl = 'http://localhost:3000/';
    expect(resolveVirtualPath('http://localhost:3000/assets/main/index.js', baseUrl)).toBe('assets/main/index.js');
    expect(resolveVirtualPath('https://my-game.com/src/settings.json?v=2#hash', 'https://my-game.com/')).toBe('src/settings.json');
  });

  it('xử lý URL tuyệt đối với baseUrl có chứa thư mục con', () => {
    const baseUrl = 'http://localhost:3000/games/my-game/';
    expect(resolveVirtualPath('http://localhost:3000/games/my-game/assets/main/index.js', baseUrl)).toBe('assets/main/index.js');
  });

  it('trả về chuỗi rỗng hoặc ném lỗi nếu URL là một external link không liên quan (Tuỳ chọn)', () => {
    // Tuỳ vào cách bạn design, thường ta sẽ bỏ qua không thay đổi url nếu nó khác origin
    const baseUrl = 'http://localhost:3000/';
    expect(resolveVirtualPath('https://google-analytics.com/analytics.js', baseUrl)).toBe('https://google-analytics.com/analytics.js');
  });
});
