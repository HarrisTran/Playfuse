import { normalizePath } from "../index.js";
import { InputError } from "./errors.js";

/**
 * Xác định tiền tố root của zip dựa trên đường dẫn của index.html.
 * Logic gọt bỏ tiền tố này sẽ giúp giữ cho file index.html luôn nằm ở root của VFS
 * và các tài nguyên khác được giữ nguyên cấu trúc tương đối.
 *
 * @param paths - Iterable chứa các đường dẫn đã được normalize.
 * @returns Chuỗi tiền tố rỗng nếu index.html ở root, ngược lại trả về tiền tố có chứa dấu '/'.
 * @throws InputError nếu không tìm thấy index.html nào.
 */
export function detectRoot(paths: Iterable<string>): string {
  const normalized = Array.from(paths).map(normalizePath);
  const indexPaths = normalized.filter((p) => p.endsWith('index.html'));

  if (indexPaths.length === 0) {
    throw new InputError('NO_INDEX_HTML', 'Không tìm thấy file index.html nào.');
  }

  indexPaths.sort((a, b) => a.length - b.length);
  const firstIndex = indexPaths[0];

  if (firstIndex === 'index.html') {
    return '';
  }

  if (firstIndex === undefined) {
    throw new InputError('NO_INDEX_HTML', 'Không tìm thấy file index.html nào.');
  }

  const lastSlashIndex = firstIndex.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return '';
  }
  
  return firstIndex.slice(0, lastSlashIndex + 1);
}
