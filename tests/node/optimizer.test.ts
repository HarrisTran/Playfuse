import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { TinyPngOptimizer } from '../../src/node/optimizer.js';
import { loadInput } from '../../src/node/input.js';
import { VirtualFS } from '../../src/core/vfs.js';

describe('TinyPngOptimizer (Rust Submodule)', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures');
  const sampleZip = path.join(fixturesDir, 'cocos-3.8-md5/web-mobile.zip');

  it('xác định đúng binary path và trạng thái khả dụng isAvailable', () => {
    const optimizer = new TinyPngOptimizer();
    expect(optimizer.getBinaryPath()).toContain('vendor/tiny-png/target/release/tiny-png');
    expect(optimizer.isAvailable()).toBe(true);
  });

  it('bỏ qua an toàn và trả về 0 nếu VFS không chứa file PNG nào', async () => {
    const vfs = VirtualFS.fromEntries([
      ['index.html', new Uint8Array([1, 2, 3])],
      ['config.json', new TextEncoder().encode('{"ok":true}')],
    ]);

    const optimizer = new TinyPngOptimizer();
    const result = await optimizer.optimize(vfs);

    expect(result.fileCount).toBe(0);
    expect(result.totalOriginalBytes).toBe(0);
    expect(result.totalOptimizedBytes).toBe(0);
    expect(result.savedBytes).toBe(0);
    expect(result.savingsPercent).toBe(0);
  });

  it('báo lỗi rõ ràng nếu binary path không tồn tại', async () => {
    const optimizer = new TinyPngOptimizer({ binaryPath: '/path/to/nonexistent-binary' });
    const vfs = VirtualFS.fromEntries([
      ['icon.png', new Uint8Array([137, 80, 78, 71])],
    ]);

    await expect(optimizer.optimize(vfs)).rejects.toThrow(/tiny-png binary not found/);
  });

  it('nén thành công toàn bộ PNG trong fixture thực tế và bảo toàn các file khác', async () => {
    const vfs = await loadInput(sampleZip);
    const initialPngFiles = vfs.list().filter((f) => f.endsWith('.png'));
    expect(initialPngFiles.length).toBeGreaterThan(0);

    // Lưu lại kích thước gốc của các PNG
    const originalPngSizes = new Map<string, number>();
    for (const p of initialPngFiles) {
      originalPngSizes.set(p, vfs.get(p)!.byteLength);
    }

    // Lưu lại nội dung của một file JS/JSON để đảm bảo không bị suy suyển
    const sampleJsContent = vfs.readText('index.html');
    expect(sampleJsContent).toBeDefined();

    const optimizer = new TinyPngOptimizer();
    const progressCalls: string[] = [];

    const result = await optimizer.optimize(vfs, {
      lossyQuality: '70-90',
      losslessLevel: 2,
      onProgress: (current, total, file) => {
        progressCalls.push(`${current}/${total}: ${file}`);
      },
    });

    // 1. Kiểm tra thống kê tiết kiệm
    expect(result.fileCount).toBe(initialPngFiles.length);
    expect(result.totalOriginalBytes).toBeGreaterThan(0);
    expect(result.totalOptimizedBytes).toBeLessThan(result.totalOriginalBytes);
    expect(result.savedBytes).toBeGreaterThan(0);
    expect(result.savingsPercent).toBeGreaterThan(30); // Thông thường giảm 50-80%
    expect(progressCalls.length).toBe(initialPngFiles.length);

    // 2. Kích thước trong VirtualFS phải được cập nhật tương ứng
    let calculatedOptimizedBytes = 0;
    for (const p of initialPngFiles) {
      const currentBytes = vfs.get(p)!.byteLength;
      const originalBytes = originalPngSizes.get(p)!;
      expect(currentBytes).toBeLessThanOrEqual(originalBytes);
      calculatedOptimizedBytes += currentBytes;
    }
    expect(calculatedOptimizedBytes).toBe(result.totalOptimizedBytes);

    // 3. File non-PNG tuyệt đối không bị ảnh hưởng
    expect(vfs.readText('index.html')).toBe(sampleJsContent);
  });
});
