import { describe, expect, it } from 'vitest';
import { getMimeType, encodeAssetToDataURI, buildAssetsMap } from '../../src/core/encoder/index.js';
import { VirtualFS } from '../../src/core/vfs.js';

describe('Encoder (Mã hoá tài nguyên)', () => {
  describe('1. getMimeType', () => {
    it('nhận diện đúng các định dạng ảnh', () => {
      expect(getMimeType('image.png')).toBe('image/png');
      expect(getMimeType('assets/bg.jpg')).toBe('image/jpeg');
      expect(getMimeType('assets/photo.jpeg')).toBe('image/jpeg');
      expect(getMimeType('icon.webp')).toBe('image/webp');
    });

    it('nhận diện đúng các định dạng âm thanh', () => {
      expect(getMimeType('sound.mp3')).toBe('audio/mpeg');
      expect(getMimeType('bgm.ogg')).toBe('audio/ogg');
    });

    it('nhận diện đúng các định dạng text và dữ liệu', () => {
      expect(getMimeType('config.json')).toBe('application/json');
      expect(getMimeType('style.css')).toBe('text/css');
      expect(getMimeType('index.html')).toBe('text/html');
      expect(getMimeType('app.js')).toBe('application/javascript');
      expect(getMimeType('readme.txt')).toBe('text/plain');
    });

    it('nhận diện đúng các định dạng nhị phân / đặc thù của Cocos', () => {
      expect(getMimeType('effect.bin')).toBe('application/octet-stream');
      expect(getMimeType('data.wasm')).toBe('application/wasm');
      expect(getMimeType('font.ttf')).toBe('font/ttf');
      expect(getMimeType('data.cconb')).toBe('application/octet-stream'); // Cocos binary
      expect(getMimeType('atlas.plist')).toBe('application/xml'); // plist
    });

    it('trả về application/octet-stream cho định dạng không xác định', () => {
      expect(getMimeType('unknown.xyz')).toBe('application/octet-stream');
      expect(getMimeType('no_extension')).toBe('application/octet-stream');
    });
  });

  describe('2. encodeAssetToDataURI', () => {
    it('mã hoá đúng chuỗi Text sang Base64 Data URI', () => {
      // "hello" -> Base64 là "aGVsbG8="
      const vfs = VirtualFS.fromEntries([
        ['test.txt', new TextEncoder().encode('hello')]
      ]);
      const dataURI = encodeAssetToDataURI(vfs, 'test.txt');
      expect(dataURI).toBe('data:text/plain;base64,aGVsbG8=');
    });

    it('mã hoá đúng Binary sang Base64 Data URI', () => {
      // Giả lập 4 byte ngẫu nhiên (vd magic number của PNG)
      const vfs = VirtualFS.fromEntries([
        ['image.png', new Uint8Array([137, 80, 78, 71])]
      ]);
      const dataURI = encodeAssetToDataURI(vfs, 'image.png');
      // [137, 80, 78, 71] -> base64 là "iVBORw=="
      expect(dataURI).toBe('data:image/png;base64,iVBORw==');
    });
  });

  describe('3. buildAssetsMap', () => {
    it('chuyển đổi danh sách file path thành từ điển __assetsMap__', () => {
      const vfs = VirtualFS.fromEntries([
        ['assets/bg.jpg', new TextEncoder().encode('fake-jpg')],
        ['assets/music.mp3', new TextEncoder().encode('fake-mp3')],
      ]);
      const assetsList = ['assets/bg.jpg', 'assets/music.mp3'];

      const assetsMap = buildAssetsMap(vfs, assetsList);

      // Map trả về phải có đúng 2 keys
      expect(Object.keys(assetsMap).length).toBe(2);
      
      // Kiểm tra Data URI cấu trúc hợp lệ
      expect(assetsMap['assets/bg.jpg']).toMatch(/^data:image\/jpeg;base64,/);
      expect(assetsMap['assets/music.mp3']).toMatch(/^data:audio\/mpeg;base64,/);
      
      // Đảm bảo data đã được encode base64 chính xác
      const expectedJpgBase64 = Buffer.from('fake-jpg').toString('base64');
      expect(assetsMap['assets/bg.jpg']).toBe(`data:image/jpeg;base64,${expectedJpgBase64}`);
    });
  });
});
