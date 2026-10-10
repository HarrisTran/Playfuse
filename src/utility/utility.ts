export function dataURItoBlobSync(dataURI: string) : Blob {
  // 1. Tách phần header và phần dữ liệu base64
  const [header, base64Data] = dataURI.split(',');
  if (!header || !base64Data) {
    throw new Error('Invalid data URI');
  }
  const mimeTypeMatch = header.match(/:(.*?);/);
  if (!mimeTypeMatch) {
    throw new Error('Invalid data URI');
  }
  const mimeType = mimeTypeMatch[1];

  const byteCharacters = atob(base64Data);

  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  // 4. Đóng gói thành Blob
  return new Blob([byteNumbers], { type: mimeType || 'application/octet-stream' });
}