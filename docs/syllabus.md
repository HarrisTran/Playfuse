# 🎓 Đề Cương Khoá Học: Xây Dựng Playfuse Build Tool

> **Môn học:** Kỹ thuật Xây dựng Công cụ Build (Build Tooling Engineering)  
> **Đồ án cuối khoá:** `Playfuse` — Công cụ chuyển đổi bản build `web-mobile` từ Cocos Creator (3.x) thành **1 file HTML duy nhất** tương thích với các Ad Network hàng đầu (AppLovin, IronSource, Mintegral, Unity, Google...).  
> **Ngôn ngữ & Môi trường:** TypeScript (Node.js 20+ ESM, sau đó chuyển dịch sang Browser / Web Worker).

---

## 📌 Phương Pháp Đào Tạo & Tiêu Chuẩn Nộp Bài

1. **Cấu trúc mỗi bài học:**
   - 📖 **Lý thuyết nền tảng:** Đi sâu vào nguyên lý trình duyệt, runtime engine, hoặc design pattern liên quan trước khi bắt tay vào code.
   - 🎯 **Yêu cầu bài tập (Workload & Deliverables):** Danh sách task, interface định nghĩa rõ ràng.
   - ✅ **Tiêu chí nghiệm thu (Acceptance Criteria):** Điều kiện bắt buộc để pass bài tập (test case, lint, benchmark).
   - 💡 **Gợi ý & Câu hỏi tư duy:** Định hướng suy nghĩ kiến trúc, không đưa sẵn code giải pháp.
2. **Quy trình nộp bài:**
   - Bạn tự đảm nhận viết code và unit test trong repo.
   - Khi hoàn thành, thông báo: `"Nộp bài X"`.
   - Giảng viên sẽ review chi tiết code, chạy test suite, kiểm tra edge case và chấm điểm theo Rubric (Cần đạt **≥ 8/10** để mở khoá bài tiếp theo).

### Thang Điểm Rubric (10 điểm)

| Tiêu chí | Điểm | Ý nghĩa & Tiêu chuẩn |
|---|:---:|---|
| **Chức năng (Functionality)** | 4.0 | Đạt 100% tiêu chí nghiệm thu và pass tất cả test cases (kể cả edge cases). |
| **Kiến trúc & Phân tầng (Architecture)** | 2.0 | Tuân thủ Dependency Rule (Core không dính Node/DOM, Runtime độc lập, Node/Web là adapter). |
| **An toàn Kiểu (Type Safety)** | 1.5 | Không dùng `any`, không ép kiểu `as` vô căn cứ, tận dụng Discriminated Unions và Type Guards. |
| **Kiểm thử (Automated Tests)** | 1.5 | Có unit test bao phủ các nhánh logic chính và trường hợp biên (edge cases). |
| **Chất lượng Code (Clean Code)** | 1.0 | Đặt tên rõ nghĩa, xử lý lỗi có hệ thống, JSDoc giải thích nguyên do (Why thay vì What). |

---

## 🗺️ Lộ Trình & Khối Lượng Công Việc Chi Tiết Từng Bài

### Module 0: Nền Tảng & Thiết Lập Dự Án (Giai đoạn 1)

#### [Đã xong] Bài 0: Playable Ads & Giải Phẫu Bản Build Cocos 3.x
- **Mục tiêu:** Hiểu rõ 5 "cửa" nạp tài nguyên của trình duyệt (`<script>`, `fetch`, `XHR`, `Image`, `SystemJS`) và cơ chế CORS khiến game chết trên giao thức `file://`.
- **Khối lượng công việc:**
  - Khảo sát thực tế bản build Cocos 3.8.x bằng Chrome DevTools Network tab.
  - Phân tích `index.html`, `import-map.json`, `settings.json`, các chunk `bundle.js`.
  - Thiết lập 2 fixture thực tế trong repo: `cocos-3.8-basic` (tắt MD5) và `cocos-3.8-md5` (bật MD5).
- **Kết quả nghiệm thu:** `docs/notes/lesson-00.md`, fixture âm thanh, hình ảnh và asset game.

#### [Đã xong] Bài 1: Thiết Lập Dự Án TS Hiện Đại & Phân Tầng Kiến Trúc
- **Mục tiêu:** Xây dựng dự án TypeScript chuẩn ESM (`NodeNext`), strict type-checking, và áp đặt ranh giới phụ thuộc nghiêm ngặt qua linter.
- **Khối lượng công việc:**
  - Cấu hình tách biệt `tsconfig.json` (typecheck), `tsconfig.build.json` (build ra `dist/`), và `src/runtime/tsconfig.json` (DOM sandbox).
  - Tách 4 tầng thư mục: `core/`, `node/`, `cli/`, `runtime/`.
  - Cấu hình ESLint flat config với `no-restricted-imports` cấm Node built-in modules trong `src/core/**`.
  - Hiện thực hàm pure TS `normalizePath` xử lý path resolution an toàn trên mọi hệ điều hành.
- **Kết quả nghiệm thu:** Lint, typecheck, test xanh 100%, CLI entry point hiển thị version.

---

### Module 1: Virtual File System & Quét Phân Loại (Giai đoạn 2.1)

#### [Hiện tại] Bài 2: Virtual File System (VFS) & InputSource
- **Lý thuyết:** Kiến trúc Ports & Adapters; Xử lý nhị phân đẳng cấu (`Uint8Array` vs `Buffer`); Phát hiện thư mục gốc linh hoạt; Phòng chống lỗ hổng bảo mật Zip Slip; Sử dụng thư viện `fflate` gọn nhẹ (~8KB, hỗ trợ browser/worker và pure sync/async stream).
- **Khối lượng công việc:**
  - Xây dựng lớp bất biến `VirtualFS` trong `src/core/vfs.ts`.
  - Viết `src/core/input/unzip.ts` giải nén dữ liệu từ `Uint8Array` bằng `fflate`.
  - Viết bộ lọc file rác `src/core/input/junk.ts` (`.DS_Store`, `__MACOSX`, `Thumbs.db`...).
  - Viết module phát hiện thư mục gốc chứa `index.html`: `src/core/input/root.ts`.
  - Viết Node adapter `src/node/input.ts` nhận diện đầu vào là folder hay zip để nạp vào `VirtualFS`.
- **Nghiệm thu:** Test tương đương trên cả 2 fixture zip và folder; Test chặn Zip Slip; Tốc độ nạp < 500ms.

#### Bài 3: Scanner — Bộ Phân Loại Tài Nguyên Thông Minh
- **Lý thuyết:** Heuristic Scanner vs Rule-based Scanner; Cách Cocos 3.x định danh file qua UUID và MD5 hash; Thứ tự phụ thuộc thực thi của Script tags.
- **Khối lượng công việc:**
  - Định nghĩa kiểu dữ liệu `ScannedProject`:
    - `html`: `index.html`
    - `css`: Các file stylesheet
    - `engineScripts`: Polyfills, SystemJS
    - `gameScripts`: `index.js`, `application.js`, `cocos-js/cc.js`, `src/chunks/**`
    - `settings`: `settings.json`, `import-map.json`
    - `assets`: Binary & config (`.png`, `.jpg`, `.mp3`, `.json`, `.cconb`, `.bin`, `.ttf`...)
  - Quét asset phụ thuộc từ `settings.json` (`effectSettingsPath`, `projectBundles`).
  - Hỗ trợ phân loại chính xác bất kể project có bật hay tắt MD5 Cache.
- **Nghiệm thu:** Unit test scanner trên cả 2 fixture phân loại đúng 100% file, không sót asset ngầm.

---

### Module 2: Mã Hoá & Từ Điển Asset Ảo (Giai đoạn 2.2)

#### Bài 4: MIME Type Mapper & Base64 Data URI Serializer
- **Lý thuyết:** Cấu trúc Data URI (`data:<mime>;base64,<payload>`); Hiệu ứng phình kích thước của Base64 (+33%); Chuyển đổi hiệu năng cao giữa binary và base64 string; Bộ nhớ heap trong Node.js.
- **Khối lượng công việc:**
  - Xây dựng Pure MIME mapper hỗ trợ đầy đủ các định dạng Cocos 3.x (`.png`, `.jpg`, `.webp`, `.mp3`, `.ogg`, `.json`, `.bin`, `.cconb`, `.wasm`, `.ttf`, `.plist`).
  - Xây dựng `AssetEncoder` chuyển đổi file trong VFS thành Base64 Data URI.
  - Tạo cấu trúc từ điển tra cứu ảo `__assetsMap__` mapping đường dẫn tương đối đã chuẩn hóa sang Data URI.
- **Nghiệm thu:** Serialize toàn bộ asset của fixture sang Data URI hợp lệ; Kiểm tra tính toàn vẹn nhị phân khi decode ngược lại.

---

### Module 3: Runtime Injection Hooks (Giai đoạn 2.3 — Trọng Tâm Kỹ Thuật)

#### Bài 5: Lý Thuyết Monkey-patching & Khử Ảo Hoá Đường Dẫn (Path Resolution)
- **Lý thuyết:** Kỹ thuật Monkey-patching trong JavaScript; Sự khác nhau giữa URL tuyệt đối và URL tương đối khi gọi `fetch`/`XHR`; Virtual Path Resolver tương thích với `__assetsMap__`.
- **Khối lượng công việc:**
  - Viết pure resolver logic trong `src/runtime/path.ts`: biến đổi URL từ request (`./assets/main/native/...`, `http://localhost/.../assets/...`) thành key tương ứng trong map.
  - Viết unit test giả lập các kiểu URL mà Cocos 3.x tạo ra trong quá trình chạy.
- **Nghiệm thu:** 100% test case resolve path khớp chính xác với key trong từ điển asset.

#### Bài 6: Intercepting Network — Hook `window.fetch` & `XMLHttpRequest`
- **Lý thuyết:** Vòng đời của một XHR request (`open`, `send`, `onload`, `status`, `responseType`); Cấu trúc `Response`, `Blob`, `ArrayBuffer` trong fetch API; Data URI to Blob/ArrayBuffer conversion trong browser.
- **Khối lượng công việc:**
  - Monkey-patch `window.fetch`: Chặn URL có trong `__assetsMap__`, convert Data URI thành `Blob`/`ArrayBuffer`, trả về `new Response(...)` giả lập mã 200.
  - Monkey-patch `window.XMLHttpRequest`: Can thiệp `open` và `send`, giả lập sự kiện `load` và gán `response`/`responseText` tương thích theo `responseType` (`"text"`, `"json"`, `"arraybuffer"`).
- **Nghiệm thu:** Test suite chạy trong môi trường browser/jsdom giả lập, load thành công JSON và binary data qua cả fetch lẫn XHR.

#### Bài 7: Hook SystemJS, Image & WebAudio — Khởi Động Cocos Không Cần Mạng
- **Lý thuyết:** Cơ chế nạp script động của SystemJS (`createElement('script')` vs in-memory registration); `Image.src` data URI; `AudioContext.decodeAudioData` và WebAudio pipeline; Font loading qua `FontFace`.
- **Khối lượng công việc:**
  - Patch SystemJS hook để nạp script từ bộ nhớ thay vì tạo network request.
  - Patch constructor `Image` hoặc setter `Image.prototype.src` để tự động gán Data URI.
  - Patch `FontFace` API phục vụ custom TTF fonts.
  - Đóng gói toàn bộ code runtime hook thành chuỗi template JS tự kích hoạt (IIFE).
- **Nghiệm thu:** Đảm bảo toàn bộ asset font, ảnh, âm thanh, script module nạp trơn tru trong sandbox không có server mạng.

---

### Module 4: Đóng Gói Thành 1 File HTML & Kiểm Thử E2E (Giai đoạn 2.4 - 2.5)

#### Bài 8: HTML Bundler & Inlining Engine
- **Lý thuyết:** Phân tích cú pháp HTML; Thứ tự ưu tiên CSS và Scripts; Hiểm hoạ vỡ DOM khi script chứa chuỗi `</script>` và kỹ thuật escaping `<\/script>`.
- **Khối lượng công việc:**
  - Đọc `index.html` gốc, thay thế các thẻ `<link rel="stylesheet">` bằng thẻ `<style>` inline.
  - Nhúng bảng `window.__assetsMap__` và đoạn code Runtime Hooks vào đầu thẻ `<head>`.
  - Nhúng các Engine Scripts và Game Scripts vào các thẻ `<script>` inline theo đúng thứ tự phụ thuộc.
  - Thực hiện escape an toàn toàn bộ nội dung script nhúng inline.
- **Nghiệm thu:** Tạo ra file `output.html` duy nhất, cú pháp HTML hợp lệ, kích thước chuẩn xác.

#### Bài 9: Hoàn Thiện CLI & Kiểm Thử E2E Trình Duyệt Thật
- **Lý thuyết:** Xây dựng Command-line Interface thân thiện; Logging và ProgressBar; Tự động hoá kiểm thử E2E không đầu (Headless Browser) với Playwright / Puppeteer.
- **Khối lượng công việc:**
  - Viết CLI hoàn chỉnh `playfuse build <input> -o <output.html>`.
  - Viết test E2E: Dùng Playwright mở trực tiếp file `output.html` qua giao thức `file:///`.
  - Bắt console log của Cocos: Đảm bảo game chuyển sang trạng thái `start()`, canvas render frame đầu tiên, không có lỗi mạng (404/CORS).
- **Nghiệm thu:** File HTML độc lập mở bằng `file://` trên trình duyệt thật chạy hoàn hảo.

---

### Module 5: Ad Network Adapters (Giai đoạn 3 — Strategy Pattern)

#### Bài 10: Lớp Trừu Tượng CTA & Strategy Pattern
- **Lý thuyết:** Strategy Design Pattern; Vấn đề phân mảnh API quảng cáo; Lớp trừu tượng hoá hành vi Call-To-Action (CTA).
- **Khối lượng công việc:**
  - Định nghĩa interface `AdNetworkAdapter` với các phương thức: `injectHead()`, `injectBody()`, `wrapCTA()`.
  - Thiết kế API chung cho developer game: `window.installClick()`.
  - Tạo `NetworkRegistry` quản lý các adapter theo tên.
- **Nghiệm thu:** Type-check strict các adapter, hỗ trợ cấu hình động qua tham số CLI.

#### Bài 11: Hiện Thực Adapter Từng Mạng & Batch Build
- **Lý thuyết:** SDK specs của AppLovin (MRAID v2/v3), Google Ads (ExitApi), Mintegral (gameStart/gameClose), Unity Ads, IronSource.
- **Khối lượng công việc:**
  - Viết adapter cho:
    - `AppLovin / IronSource`: Nhúng `mraid.js` và xử lý `mraid.open(storeUrl)`.
    - `Google Ads`: Nhúng metadata và gọi `ExitApi.exit()`.
    - `Mintegral`: Tích hợp `window.install()` và xử lý pause/resume âm thanh.
  - Bổ sung tuỳ chọn CLI `--network=applovin|google|mintegral|all`. Khi chọn `all`, tự động xuất từng file HTML tương ứng vào thư mục `dist/`.
- **Nghiệm thu:** Kiểm tra file output của từng network tuân thủ đúng tài liệu kỹ thuật của mạng quảng cáo đó.

---

### Module 6: Web UI Kéo - Thả Trên Trình Duyệt (Giai đoạn 4)

#### Bài 12: Đẳng Cấu Hoá Core Engine & Web Worker
- **Lý thuyết:** Isomorphic / Universal JavaScript; Giới hạn của Main Thread khi xử lý file lớn (UI blocking); Giao tiếp qua lại với Web Worker (`postMessage`, `Transferable Objects`).
- **Khối lượng công việc:**
  - Tách rời hoàn toàn các adapter đọc file đĩa của Node.js, cung cấp adapter trên Web sử dụng `File` / `Blob` API.
  - Đóng gói toàn bộ luồng Build Tool chạy ngầm trong Web Worker để giao diện không bị giật lag khi xử lý file nặng.
- **Nghiệm thu:** Core build chạy trơn tru 100% trong môi trường Browser mà không gọi bất kỳ Node API nào.

#### Bài 13: Xây Dựng Giao Diện Kéo - Thả (Dropzone & Live Preview)
- **Lý thuyết:** UX cho công cụ Developer; Sandboxing `<iframe>` để preview game an toàn; Theo dõi tiến độ build và kích thước file trực quan.
- **Khối lượng công việc:**
  - Xây dựng giao diện hiện đại: Dropzone kéo thả file `.zip`, danh sách checkbox Ad Network, thanh đo dung lượng (Size Inspector).
  - Tích hợp khung `<iframe>` sandbox cho phép chơi thử game và test nút CTA ngay tại chỗ sau khi đóng gói.
  - Tải về file `.html` đơn lẻ hoặc gói `.zip` chứa toàn bộ biến thể mạng quảng cáo.
- **Nghiệm thu:** Ứng dụng web hoạt động hoàn chỉnh độc lập trên trình duyệt client-side.

---

### Module 7: Tối Ưu Dung Lượng & Hiệu Năng (Giai đoạn 5)

#### Bài 14: Asset Deduplication (Chống Trùng Lặp) & Nén Ảnh Tích Hợp
- **Lý thuyết:** Hash cryptographic (SHA-256) xác định trùng lặp nội dung; Tối ưu dung lượng Payload Base64; Tích hợp module nén nhị phân native / Wasm.
- **Khối lượng công việc:**
  - Tính SHA-256 cho toàn bộ asset; Nếu nhiều đường dẫn trỏ đến nội dung giống nhau, chỉ lưu 1 bản Base64 duy nhất trong `__assetsMap__`, các đường dẫn khác chỉ là tham chiếu alias.
  - Tích hợp công cụ nén ảnh `tiny-png` (Rust) qua CLI wrapper hoặc build Wasm để tối ưu hoá texture trước khi đưa vào bundle.
- **Nghiệm thu:** Giảm dung lượng file output cuối cùng thêm 15% - 40% trên các project có nhiều asset lặp lại.

---

## 🏛️ Sơ Đồ Kiến Trúc Toàn Hệ Thống

```mermaid
flowchart TB
    subgraph Inputs["1. Nguồn Dữ Liệu"]
        ZIP["File .zip"]
        DIR["Thư mục web-mobile"]
        BROWSER_FILE["File kéo-thả (Web)"]
    end

    subgraph Adapters["2. Tầng Chuyển Đổi Nạp (Input Adapters)"]
        NODE_LOADER["src/node/input.ts"]
        WEB_LOADER["src/web/input.ts (Giai đoạn 4)"]
        ZIP_CORE["src/core/input/unzip.ts"]
    end

    subgraph CoreEngine["3. Core Engine (Pure TypeScript)"]
        VFS["Virtual File System (VirtualFS)"]
        SCANNER["Asset Scanner (Phân loại JS/CSS/Assets)"]
        ENCODER["Base64 Serializer & Map Builder"]
        MERGER["HTML Inline Bundler"]
        DEDUP["Deduplication Engine (SHA-256)"]
    end

    subgraph Runtime["4. Injected Runtime (Chạy trong WebView quảng cáo)"]
        HOOKS["Runtime Network Hooks (fetch / XHR)"]
        SYSTEM_HOOK["SystemJS Module Interceptor"]
        MEDIA_HOOK["Image & Font & Audio Interceptor"]
        CTA_LAYER["CTA Abstraction (installClick)"]
    end

    subgraph Strategies["5. Ad Network Strategies"]
        APPLOVIN["AppLovin Adapter (MRAID)"]
        GOOGLE["Google Ads Adapter (ExitApi)"]
        MINTEGRAL["Mintegral Adapter"]
        UNITY["Unity Ads Adapter"]
    end

    subgraph Outputs["6. Đầu Ra Hoàn Chỉnh"]
        SINGLE_HTML["dist/index.html (Single File)"]
        BUNDLE_ZIP["dist/all-networks.zip"]
    end

    ZIP --> NODE_LOADER
    DIR --> NODE_LOADER
    BROWSER_FILE --> WEB_LOADER
    NODE_LOADER --> ZIP_CORE
    WEB_LOADER --> ZIP_CORE
    NODE_LOADER --> VFS
    ZIP_CORE --> VFS

    VFS --> SCANNER
    SCANNER --> DEDUP
    DEDUP --> ENCODER
    ENCODER --> MERGER

    HOOKS --> MERGER
    SYSTEM_HOOK --> MERGER
    MEDIA_HOOK --> MERGER
    CTA_LAYER --> MERGER

    STRATEGIES --> MERGER
    APPLOVIN -.-> STRATEGIES
    GOOGLE -.-> STRATEGIES
    MINTEGRAL -.-> STRATEGIES
    UNITY -.-> STRATEGIES

    MERGER --> SINGLE_HTML
    MERGER --> BUNDLE_ZIP
```
