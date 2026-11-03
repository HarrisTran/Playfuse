import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { VirtualFS } from '../core/vfs.js';
import type {
  ImageOptimizer,
  OptimizeOptions,
  OptimizeResult,
} from '../core/optimizer/types.js';

export interface TinyPngOptimizerConfig {
  binaryPath?: string;
}

export class TinyPngOptimizer implements ImageOptimizer {
  private readonly binaryPath: string;

  constructor(config?: TinyPngOptimizerConfig) {
    this.binaryPath = config?.binaryPath ?? this.resolveDefaultBinaryPath();
  }

  private resolveDefaultBinaryPath(): string {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(currentDir, '../../vendor/tiny-png/target/release/tiny-png'),
      path.resolve(currentDir, '../../../vendor/tiny-png/target/release/tiny-png'),
      path.resolve(process.cwd(), 'vendor/tiny-png/target/release/tiny-png'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0]!;
  }

  public getBinaryPath(): string {
    return this.binaryPath;
  }

  public isAvailable(): boolean {
    return fs.existsSync(this.binaryPath);
  }

  public async optimize(
    vfs: VirtualFS,
    options?: OptimizeOptions
  ): Promise<OptimizeResult> {
    const pngFiles = vfs.list().filter((file) => file.toLowerCase().endsWith('.png'));

    if (pngFiles.length === 0) {
      return {
        totalOriginalBytes: 0,
        totalOptimizedBytes: 0,
        savedBytes: 0,
        savingsPercent: 0,
        fileCount: 0,
      };
    }

    if (!this.isAvailable()) {
      throw new Error(
        `tiny-png binary not found at "${this.binaryPath}". Please run "npm run build:optimizer" to compile the Rust binary.`
      );
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playfuse-png-'));

    try {
      let totalOriginalBytes = 0;

      // 1. Export all PNGs from VirtualFS to tempDir
      for (const relPath of pngFiles) {
        const buffer = vfs.get(relPath);
        if (!buffer) continue;

        totalOriginalBytes += buffer.byteLength;
        const fullTempPath = path.join(tempDir, relPath);
        fs.mkdirSync(path.dirname(fullTempPath), { recursive: true });
        fs.writeFileSync(fullTempPath, buffer);
      }

      // 2. Prepare CLI arguments
      const lossy = options?.lossyQuality ?? '70-90';
      const lossless = String(options?.losslessLevel ?? 2);
      const args = [tempDir, '--q-lossy', lossy, '--q-lossless', lossless];

      // 3. Execute tiny-png binary
      await new Promise<void>((resolve, reject) => {
        execFile(this.binaryPath, args, (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `tiny-png optimization failed: ${error.message}${stdout ? `\nSTDOUT: ${stdout}` : ''}${stderr ? `\nSTDERR: ${stderr}` : ''}`
              )
            );
            return;
          }
          resolve();
        });
      });

      // 4. Read back optimized PNGs into VirtualFS
      let totalOptimizedBytes = 0;

      for (let i = 0; i < pngFiles.length; i++) {
        const relPath = pngFiles[i]!;
        const originalData = vfs.get(relPath);
        if (!originalData) continue;

        const origLen = originalData.byteLength;
        const fullTempPath = path.join(tempDir, relPath);

        if (fs.existsSync(fullTempPath)) {
          const optimizedBuf = fs.readFileSync(fullTempPath);
          if (optimizedBuf.byteLength < origLen) {
            vfs.set(relPath, new Uint8Array(optimizedBuf));
            totalOptimizedBytes += optimizedBuf.byteLength;
          } else {
            totalOptimizedBytes += origLen;
          }
        } else {
          totalOptimizedBytes += origLen;
        }

        if (options?.onProgress) {
          options.onProgress(i + 1, pngFiles.length, relPath);
        }
      }

      const savedBytes = totalOriginalBytes - totalOptimizedBytes;
      const savingsPercent =
        totalOriginalBytes > 0 ? (savedBytes / totalOriginalBytes) * 100 : 0;

      return {
        totalOriginalBytes,
        totalOptimizedBytes,
        savedBytes,
        savingsPercent,
        fileCount: pngFiles.length,
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore temp folder deletion errors
      }
    }
  }
}
