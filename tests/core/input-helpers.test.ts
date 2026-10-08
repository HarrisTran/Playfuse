import { describe, expect, it } from 'vitest';
import { isJunkPath } from '../../src/core/input/junk.js';
import { detectRoot } from '../../src/core/input/root.js';
import { InputError } from '../../src/core/input/errors.js';

describe('Input Helpers (junk & root detection)', () => {
  describe('isJunkPath', () => {
    it('lọc bỏ các file rác của macOS và Windows', () => {
      expect(isJunkPath('.DS_Store')).toBe(true);
      expect(isJunkPath('sub/dir/.DS_Store')).toBe(true);
      expect(isJunkPath('__MACOSX/some/file.png')).toBe(true);
      expect(isJunkPath('assets/__MACOSX/file.png')).toBe(true);
      expect(isJunkPath('assets/._icon.png')).toBe(true);
      expect(isJunkPath('Thumbs.db')).toBe(true);
      expect(isJunkPath('desktop.ini')).toBe(true);

      // File bình thường
      expect(isJunkPath('index.html')).toBe(false);
      expect(isJunkPath('src/settings.json')).toBe(false);
      expect(isJunkPath('assets/main/native/0c/image.png')).toBe(false);
    });
  });

  describe('detectRoot', () => {
    it('nhận diện root rỗng khi index.html ở ngay thư mục gốc', () => {
      const paths = ['index.html', 'src/settings.json', 'style.css'];
      expect(detectRoot(paths)).toBe('');
    });

    it('nhận diện tiền tố khi zip chứa 1 thư mục bọc ngoài (vd: web-mobile/)', () => {
      const paths = [
        'web-mobile/index.html',
        'web-mobile/src/settings.json',
        'web-mobile/style.css',
      ];
      expect(detectRoot(paths)).toBe('web-mobile/');
    });

    it('nhận diện tiền tố khi zip bị lồng nhiều lớp (vd: dist/build/web-mobile/)', () => {
      const paths = [
        'dist/build/web-mobile/index.html',
        'dist/build/web-mobile/src/settings.json',
      ];
      expect(detectRoot(paths)).toBe('dist/build/web-mobile/');
    });

    it('ưu tiên index.html ở cấp nông nhất nếu có nhiều file index.html', () => {
      const paths = [
        'deep/sub/index.html',
        'build/index.html',
        'build/assets/sample/index.html',
      ];
      expect(detectRoot(paths)).toBe('build/');
    });

    it('ném lỗi NO_INDEX_HTML nếu không tìm thấy file index.html nào', () => {
      const paths = ['src/settings.json', 'style.css'];
      expect(() => detectRoot(paths)).toThrowError(InputError);
    });
  });
});
