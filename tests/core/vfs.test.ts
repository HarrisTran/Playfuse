import { describe, expect, it } from 'vitest';
import { VirtualFS } from '../../src/core/vfs.js';
import { InputError } from '../../src/core/input/errors.js';

describe('VirtualFS', () => {
  it('tạo VFS từ entries và đọc dữ liệu chính xác', () => {
    const encoder = new TextEncoder();
    const data1 = encoder.encode('Hello World');
    const data2 = new Uint8Array([1, 2, 3, 4]);

    const vfs = VirtualFS.fromEntries([
      ['index.html', data1],
      ['assets/data.bin', data2],
    ]);

    expect(vfs.fileCount).toBe(2);
    expect(vfs.totalBytes).toBe(data1.byteLength + data2.byteLength);

    expect(vfs.has('index.html')).toBe(true);
    expect(vfs.has('./index.html')).toBe(true); // Tự normalize khi get/has
    expect(vfs.has('assets//data.bin')).toBe(true);
    expect(vfs.has('non-exist.txt')).toBe(false);

    expect(vfs.readText('index.html')).toBe('Hello World');
    expect(vfs.get('assets/data.bin')).toEqual(data2);
    expect(vfs.get('non-exist.txt')).toBeUndefined();
  });

  it('danh sách file list() phải luôn được sắp xếp theo bảng chữ cái (reproducible)', () => {
    const vfs = VirtualFS.fromEntries([
      ['z.txt', new Uint8Array([1])],
      ['a.txt', new Uint8Array([2])],
      ['m.txt', new Uint8Array([3])],
    ]);

    expect(vfs.list()).toEqual(['a.txt', 'm.txt', 'z.txt']);
  });

  it('hỗ trợ lặp qua entries bằng for..of', () => {
    const entries: [string, Uint8Array][] = [
      ['a.txt', new Uint8Array([1])],
      ['b.txt', new Uint8Array([2])],
    ];
    const vfs = VirtualFS.fromEntries(entries);

    const collected: string[] = [];
    for (const [p] of vfs) {
      collected.push(p);
    }
    expect(collected).toEqual(['a.txt', 'b.txt']);
  });

  it('báo lỗi UNSAFE_PATH nếu đường dẫn thoát ra ngoài root', () => {
    expect(() => {
      VirtualFS.fromEntries([['../secret.txt', new Uint8Array([1])]]);
    }).toThrowError(InputError);
  });

  it('báo lỗi DUPLICATE_ENTRY nếu có 2 file trùng key sau khi normalize', () => {
    expect(() => {
      VirtualFS.fromEntries([
        ['src/a.ts', new Uint8Array([1])],
        ['src//a.ts', new Uint8Array([2])],
      ]);
    }).toThrowError(InputError);
  });
});
