# 📘 Kế Hoạch & Hướng Dẫn Thực Hiện: Bài 12 — Đẳng Cấu Hoá Core Engine & Web Worker

> **Học phần:** Module 6: Web UI Kéo - Thả Trên Trình Duyệt  
> **Mục tiêu:** Tách rời hoàn toàn các API I/O của Node.js (`fs`, `node:path`) khỏi Core Engine để đạt chuẩn **Isomorphic / Universal TypeScript** (chạy được trên cả Node.js CLI lẫn Trình duyệt Web), đồng thời đóng gói tiến trình Build chạy nền trong **Web Worker** để không làm đơ giao diện khi xử lý file nặng.

---

## 1. 📖 Lý Thuyết Chuyên Sâu

### 1.1. Kiến Trúc Đẳng Cấu (Isomorphic / Universal Architecture)
* **Khái niệm:** Một thư viện hoặc module được gọi là *Isomorphic* khi cùng một đoạn mã nguồn có thể chạy bình thường trong cả hai môi trường:
  1. **Runtime Server / CLI:** Node.js, Deno, Bun.
  2. **Runtime Client:** Trình duyệt Web (Chrome, Safari, Firefox), Web Worker.
* **Thực trạng hiện tại của Playfuse:**
  - Các module `scanner`, `encoder`, `injector`, `adapters` đã là Pure TS (chỉ nhận `VirtualFileSystem`, chuỗi, buffer trong RAM).
  - Tuy nhiên, hàm `packProject` tại `src/core/index.ts` hiện đang trực tiếp `import fs from 'fs'` và gọi `fs.writeFileSync`.
  - Khi đem file này bundle vào trình duyệt, trình duyệt sẽ quăng lỗi: `Module not found: Can't resolve 'fs'`.
* **Giải pháp Phân tách I/O (Ports & Adapters / Hexagonal Architecture):**
  - **Pure Core Engine (`packProjectCore`):**
    - Đầu vào: `VirtualFileSystem` (đã nạp sẵn file), `runtimeCode: string`, `networks: string`.
    - Đầu ra: Danh sách file trong bộ nhớ `PlayableOutputFile[]` (`{ network: string, relativePath: string, content: string }`). Hoàn toàn không biết đến ổ cứng hay `fs`.
  - **Node Adapter (`packProject` - CLI):**
    - Dùng `fs` để đọc folder/zip đĩa -> nạp vào `vfs`.
    - Gọi `packProjectCore(vfs, ...)`.
    - Dùng `fs.writeFileSync` ghi các file trả về ra ổ cứng theo thư mục `<outputDir>/<network>/index.html`.
  - **Browser Adapter (Web UI):**
    - Nhận `File` / `Blob` từ thẻ `<input type="file">` hoặc Drag-and-Drop.
    - Dùng `unzipBuffer` giải nén trực tiếp vào `vfs` trong RAM.
    - Gọi `packProjectCore(vfs, ...)`.
    - Dùng `Blob` / `URL.createObjectURL` để người dùng tải về hoặc nhúng vào `<iframe>`.

---

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KIẾN TRÚC ISOMORPHIC MỚI                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│      MÔI TRƯỜNG NODE.JS (CLI)     │       MÔI TRƯỜNG WEB (BROWSER)      │
│                                  │                                     │
│  - Input: Thư mục đĩa / File zip │  - Input: File / Blob từ Dropzone   │
│  - Loader: fs.readFileSync       │  - Loader: FileReader / ArrayBuffer │
└─────────────────┬────────────────┴──────────────────┬──────────────────┘
                  │                                   │
                  ▼                                   ▼
        ┌───────────────────────────────────────────────────────┐
        │        VIRTUAL FILE SYSTEM (VFS) TRONG BỘ NHỚ         │
        └──────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
        ┌───────────────────────────────────────────────────────┐
        │             PURE ISOMORPHIC CORE ENGINE               │
        │                 (packProjectCore)                     │
        │   - Scanner (quét asset, scripts, configs)            │
        │   - Encoder (Deflate zip payload trong RAM)           │
        │   - Injector (ghép HTML + Runtime Hook)               │
        │   - Adapters (tiêm SDK AppLovin/Google/Mintegral)     │
        └──────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
                  PlayableOutputFile[] (Trong RAM)
                  ┌──────────────────────────────┐
                  │ [                            │
                  │   { network: 'google', ... } │
                  │   { network: 'mintegral' }   │
                  │ ]                            │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       Node: fs.writeFileSync        Browser: URL.createObjectURL
     (<output>/<net>/index.html)     (Tải zip / Chơi thử iframe)
```

---

### 1.2. Giới Hạn Main Thread & Nguy Cơ UI Freezing
* **Single Thread của Browser:** JavaScript trên trình duyệt chạy đơn luồng. Cả render giao diện (HTML/CSS), hiệu ứng animation (60fps), xử lý sự kiện click chuột, và tính toán logic nặng đều tranh chấp một luồng **Main Thread**.
* **Tác vụ nặng khi đóng gói game:**
  1. Giải nén file zip Cocos (thường từ 5MB - 30MB) chứa hàng ngàn file nhỏ.
  2. Nén Deflate toàn bộ assets thành 1 file nhị phân nén duy nhất.
  3. Mã hoá Base64 và nối chuỗi HTML dài hàng triệu ký tự.
* **Hậu quả nếu chạy trên Main Thread:**
  - Trình duyệt bị đơ cứng hoàn toàn từ 1 đến 5 giây.
  - Vòng xoay loading đứng im, người dùng tưởng web bị crash hoặc treo máy.
  - Trình duyệt hiện popup cảnh báo: *"Page Unresponsive — Do you want to wait or exit?"*.

---

### 1.3. Giải Pháp: Web Worker
* **Web Worker** là một luồng chạy nền (Background Thread) tách biệt hoàn toàn với Main Thread.
* Khi chạy trong Worker, việc nén/xử lý file nặng 100% CPU cũng **không gây ảnh hưởng dù chỉ 1 frame hình** của giao diện ngoài Main Thread.
* **Mô hình giao tiếp Event-Driven:**
  - Main Thread gửi message:
    ```javascript
    worker.postMessage({
      type: 'BUILD',
      zipBuffer: arrayBuffer,
      networks: 'google,mintegral',
    });
    ```
  - Worker xử lý và phát sự kiện tiến độ theo thời gian thực (Real-time Progress):
    ```javascript
    self.postMessage({ type: 'PROGRESS', step: 'Compressing Assets...', percent: 60 });
    ```
  - Worker gửi kết quả khi hoàn tất:
    ```javascript
    self.postMessage({ type: 'SUCCESS', outputs: files });
    ```

---

### 1.4. Tối Ưu Bộ Nhớ: Transferable Objects (Zero-Copy Transfer)
* Mặc định, khi gọi `postMessage(data)`, dữ liệu sẽ được sao chép thông qua thuật toán **Structured Clone** (tốn thời gian clone và nhân đôi dung lượng RAM).
* Với các file nhị phân lớn như `ArrayBuffer` (chứa toàn bộ file zip game), ta sử dụng **Transferable Objects**:
  ```javascript
  // Chuyển nhượng trực tiếp quyền sở hữu bộ nhớ ArrayBuffer, không clone!
  worker.postMessage({ type: 'BUILD', zipBuffer }, [zipBuffer]);
  ```
  Tốc độ gửi dữ liệu qua Worker lúc này là **0ms (Zero-Copy)**!

---

## 2. 🎯 Nhiệm Vụ Cần Làm (Workload & Steps)

### Bước 1: Hiện thực hàm Pure Core `packProjectCore`
Tạo file `src/core/packer.ts` (hoặc tách trong `src/core/index.ts`):
- Đầu vào:
  ```typescript
  export interface PackCoreOptions {
    debug?: boolean;
    onProgress?: (step: string, percent: number) => void;
  }

  export interface PlayableOutputFile {
    network: string;
    fileName: string;     // 'index.html'
    relativePath: string; // 'google/index.html'
    content: string;      // Nội dung HTML hoàn chỉnh
  }

  export function packProjectCore(
    vfs: VirtualFileSystem,
    runtimeCode: string,
    networks: string = 'generic',
    options?: PackCoreOptions
  ): PlayableOutputFile[]
  ```
- Ràng buộc: Tuyệt đối không import `fs`, `path` từ Node.js. Đường dẫn dùng hàm `normalizePath` thuần TS.

### Bước 2: Refactor `packProject` cho Node.js CLI
Cập nhật `src/core/index.ts`:
- Hàm `packProject` phía Node chỉ làm 2 việc:
  1. `const vfs = await loadInput(inputDir);`
  2. `const outputs = packProjectCore(vfs, runtimeCode, networks, options);`
  3. Lặp qua `outputs` và ghi ra đĩa:
     ```typescript
     for (const out of outputs) {
       const targetFile = path.join(outputDir, out.relativePath);
       fs.mkdirSync(path.dirname(targetFile), { recursive: true });
       fs.writeFileSync(targetFile, out.content, 'utf-8');
     }
     ```

### Bước 3: Viết Browser Input Loader
Tạo file `src/browser/input.ts`:
- Hàm `loadBrowserZip(buffer: ArrayBuffer | Uint8Array): Promise<VirtualFileSystem>`
- Sử dụng hàm giải nén in-memory `unzipBuffer` sẵn có của Playfuse để đọc zip thành `VirtualFileSystem`.

### Bước 4: Xây dựng Web Worker đóng gói
Tạo file `src/worker/packer.worker.ts`:
- Lắng nghe event `message`:
  - Nhận `zipBuffer`, `runtimeCode`, `networks`, `debug`.
  - Khởi tạo `vfs` từ `loadBrowserZip(zipBuffer)`.
  - Bắn progress:
    - 20%: Unzipping archive
    - 50%: Scanning Cocos assets
    - 80%: Deflating payload & injecting SDKs
    - 100%: Done!
  - Trả về danh sách `PlayableOutputFile[]`.

### Bước 5: Viết bộ Test Cases kiểm thử Isomorphic & Web Worker
Tạo file `tests/core/isomorphic-packer.test.ts`:
- Kiểm tra `packProjectCore` chạy độc lập 100% trong môi trường không có `fs`.
- Kiểm tra tính đúng đắn của dữ liệu đầu ra giữa Node build và Core in-memory build.

---

## 3. 🧪 Bộ Test Cases Chuẩn Bị Sẵn

1. **Pure In-Memory Test:**
   - Tạo một `VirtualFileSystem` giả lập chứa cấu trúc project tối thiểu.
   - Gọi `packProjectCore(vfs, runtimeCode, 'google,mintegral')`.
   - Kết quả trả về đúng 2 đối tượng `PlayableOutputFile` với đường dẫn `google/index.html` và `mintegral/index.html`.
2. **Browser Loader Test:**
   - Đọc file `web-mobile.zip` thành buffer nhị phân.
   - Nạp qua `loadBrowserZip(buffer)`.
   - Kiểm tra `vfs.has('index.html') === true` và số lượng file khớp hoàn toàn.
3. **No Node Dependencies Guard Test:**
   - Kiểm tra file bundle của `src/core/packer.ts` không chứa bất kỳ require hoặc import nào tới `'fs'`, `'node:fs'`, `'child_process'`.

---

## 4. ✅ Tiêu Chí Nghiệm Thu (Acceptance Criteria)

- [ ] `packProjectCore` hoàn toàn độc lập, không import `fs` hay `node:path`.
- [ ] Hàm `packProject` của CLI tiếp tục chạy bình thường, tái sử dụng `packProjectCore`.
- [ ] Chạy lệnh `npm test` và toàn bộ test suite pass 100%.
- [ ] Build bundle browser không gặp lỗi thiếu module `fs`.
