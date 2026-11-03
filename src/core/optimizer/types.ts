import type { VirtualFS } from '../vfs.js';

export interface OptimizeOptions {
  /**
   * Quality range for lossy compression (imagequant), e.g. "70-90"
   * @default "70-90"
   */
  lossyQuality?: string;

  /**
   * Lossless optimization preset (oxipng), 0-6
   * @default 2
   */
  losslessLevel?: number;

  /**
   * Callback for progress reporting
   */
  onProgress?: (current: number, total: number, file: string) => void;
}

export interface OptimizeResult {
  totalOriginalBytes: number;
  totalOptimizedBytes: number;
  savedBytes: number;
  savingsPercent: number;
  fileCount: number;
}

export interface ImageOptimizer {
  optimize(vfs: VirtualFS, options?: OptimizeOptions): Promise<OptimizeResult>;
}