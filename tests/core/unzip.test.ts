import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { vfsFromZip } from '../../src/core/input/unzip.js';
import { InputError } from '../../src/core/input/errors.js';

describe('vfsFromZip', () => {
  it('giải nén zip, tự gọt bỏ folder root và lọc file rác', async () => {
    // Tạo buffer zip giả lập trong bộ nhớ
    const zipData = zipSync({
      'web-mobile/index.html': strToU8('<html></html>'),
      'web-mobile/.DS_Store': strToU8('trash'),
      '__MACOSX/._trash': strToU8('trash'),
      'web-mobile/src/settings.json': strToU8('{"version":"1.0"}'),
    });

    const vfs = await vfsFromZip(zipData);

    expect(vfs.has('index.html')).toBe(true);
    expect(vfs.has('src/settings.json')).toBe(true);
    expect(vfs.readText('index.html')).toBe('<html></html>');

    // Không được chứa file rác
    expect(vfs.has('.DS_Store')).toBe(false);
    expect(vfs.has('web-mobile/.DS_Store')).toBe(false);
    expect(vfs.has('__MACOSX/._trash')).toBe(false);

    // Key phải tương đối so với index.html, không mang tiền tố web-mobile/
    expect(vfs.has('web-mobile/index.html')).toBe(false);
  });

  it('chặn tấn công Zip Slip (chứa path ../) và ném UNSAFE_PATH', async () => {
    const maliciousZip = zipSync({
      'index.html': strToU8('ok'),
      '../evil.sh': strToU8('malicious script'),
    });

    await expect(vfsFromZip(maliciousZip)).rejects.toThrowError(InputError);
  });

  it('ném lỗi INVALID_ZIP nếu dữ liệu đầu vào không phải định dạng zip', async () => {
    const invalidBytes = new Uint8Array([1, 2, 3, 4, 5]);
    await expect(vfsFromZip(invalidBytes)).rejects.toThrowError(InputError);
  });
});
