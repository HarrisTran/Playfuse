export function isJunkPath(path: string): boolean {
  // Chuẩn hóa tạm thời để kiểm tra
  const p = path.replace(/\\/g, '/');
  const segments = p.split('/');
  const filename = segments[segments.length - 1] ?? '';

  if (segments.some((seg) => seg === '__MACOSX')) return true;
  if (filename === '.DS_Store' || filename === 'Thumbs.db' || filename === 'desktop.ini') return true;
  if (filename.startsWith('._')) return true;

  return false;
}
