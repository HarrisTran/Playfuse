/**
 * Chuẩn hóa file path thuần TypeScript (Pure TS - Runtime Agnostic):
 * - Đổi \ thành /
 * - Bỏ ./ ở đầu và các đoạn ./ ở giữa
 * - Gộp các dấu // liên tiếp
 * - Rút gọn a/b/../c -> a/c bằng Stack
 * - Hỗ trợ các trường hợp biên: "", "../x", "/abs", root "/"
 */
export function normalizePath(p: string): string {
    if (p === '') return '';
    const normalized = p.replace(/\\/g, "/");
    const isAbsolute = normalized.startsWith("/");

    const segments = normalized.split("/");
    const parts: string[] = [];

    for(const part of segments) {
        if(part === "" || part === ".") continue;
        if(part === "..") {
            const top = parts[parts.length - 1];
            if (top !== undefined && top !== "..") parts.pop();
            else if (!isAbsolute) {
                parts.push("..")
            }
        } else {
            parts.push(part);
        }
    }

    if (isAbsolute) {
        return `/${parts.join('/')}`;
    }

    return parts.join('/');
}
