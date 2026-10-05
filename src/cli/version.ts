import { createRequire } from 'node:module';

interface PackageInfo {
    name: string;
    version: string;
}

function isPackageInfo(value: unknown): value is PackageInfo {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return typeof record['name'] === 'string' && typeof record['version'] === 'string';
}

/**
 * Đọc name/version từ package.json.
 * `src/cli/` (dev) và `dist/cli/` (build) có cùng độ sâu so với package.json,
 * nên cùng một đường dẫn `../../package.json` dùng được ở cả hai môi trường.
 */
export function getVersion(): string {
    const require = createRequire(import.meta.url);
    const pkg: unknown = require('../../package.json');
    if (!isPackageInfo(pkg)) {
        throw new Error('package.json không hợp lệ: thiếu "name" hoặc "version".');
    }
    return `${pkg.name} v${pkg.version}`;
}
