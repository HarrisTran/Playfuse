# Kế hoạch phát triển Playable Ads Single-File HTML Build Tool (Cocos Creator)

Mục tiêu: Xây dựng công cụ chuyển đổi thư mục/file zip build `web-mobile` từ Cocos Creator (3.x) thành một file HTML duy nhất (hoặc gói bundle cho từng Ad Network), trước mắt chạy độc lập dưới dạng standalone script, sau đó tích hợp giao diện kéo thả.

---

## Giai đoạn 1: Thiết kế Kiến trúc (Phân tích & Proof of Concept)

- [ ] **1.1. Quyết định công nghệ cho Core Engine**
  - *Phương án A (JS/TS):* Node.js + `jszip` + `cheerio` (dễ bảo trì, dễ tái sử dụng trên browser).
  - *Phương án B (Rust Hybrid / Native):* Rust CLI + crate `zip`, `oxipng`, `base64-simd`, sau này build ra Wasm cho Web.
  - *Quyết định đề xuất:* Bắt đầu bằng Node.js/TypeScript để hoàn thiện toàn bộ logic hook Cocos, sau đó port các module nặng (unzip/image compress) sang Rust/Wasm nếu cần tối ưu hiệu năng. Viết bằng Typescript để control rõ ràng kiểu dữ liệu và logic, tránh lỗi runtime. Sử dụng công nghệ hiện đại, dễ bảo trì.

---

## Giai đoạn 2: Xây dựng Core

- [ ] **2.1. Module đọc & phân loại dữ liệu (Extractor & Scanner)**
  - Nhận đầu vào: Đường dẫn file `.zip` hoặc thư mục build `web-mobile`.
  - Quét và phân tách các tệp tin theo nhóm:
    - HTML/CSS: `index.html`, `style-mobile.css`.
    - Engine Core JS: `cocos2d-js-min.js`, `system.bundle.js`, `polyfills.bundle.js`, v.v.
    - Application Scripts: `src/project.js`, modules code trong `src/`.
    - Settings/Configs: `config.json` (3.x).
    - Assets/Binaries: Toàn bộ nội dung trong `res/` hoặc `assets/` (.png, .jpg, .json, .mp3, .bin, .plist, .cconb).

- [ ] **2.2. Module mã hóa Asset (Base64 Serializer & Optimizer)**
  - Tự động map mime-type cho từng loại file.
  - Chuyển toàn bộ asset nhị phân thành chuỗi Data URI: `data:<mime-type>;base64,<data>`.
  - Lưu vào một cấu trúc từ điển tra cứu ảo: `window.__assetsMap__ = { "assets/main/native/...": "data:image/png..." }`.
  - *(Tùy chọn nâng cao)*: Tích hợp nén ảnh (lossless/lossy) để giảm dung lượng file cuối cùng. Đã có project nén ảnh hoàn chỉnh viết bằng Rust ở thư mục nội bộ trên máy `/Users/macbookpro/PersonalProject/tiny-png`.

- [ ] **2.3. Xây dựng Injection Hooks (Trọng tâm kỹ thuật)**
  - **Hook cho Cocos 3.x:**
    - Tạo đoạn code Monkey-patching cho `window.fetch` và `window.XMLHttpRequest`.
    - Chặn request, đối chiếu URL tương đối với `window.__assetsMap__`, trả về `Response(Blob)` hoặc giả lập event load cho XHR.
    - Đảm bảo SystemJS nạp được các file module script nội bộ trong bộ nhớ.

- [ ] **2.4. Module Bundler & Inline Merger**
  - Đọc `index.html` gốc.
  - Thay thế các thẻ `<link rel="stylesheet">` bằng thẻ `<style>` nhúng trực tiếp code CSS.
  - Chèn đoạn code Hook & Dictionary Base64 vào đầu thẻ `<head>`.
  - Nhúng toàn bộ script Engine và script Game vào thẻ `<script>` inline theo đúng thứ tự thực thi gốc.
  - Escape các chuỗi nguy hiểm như `</script>` trong source code thành `<\/script>` để tránh vỡ cú pháp HTML.
  - Ghi file kết quả ra đĩa: `dist/index.html`.

- [ ] **2.5. Kiểm thử độc lập (Validation)**
  - Chạy `node build.js input.zip -o dist/output.html`.
  - Mở `dist/output.html` trực tiếp trên trình duyệt bằng giao thức `file:///` hoặc qua local server.
  - Kiểm tra Console: Không có lỗi 404, không có lỗi CORS, hình ảnh/âm thanh hoạt động chính xác.

---

## Giai đoạn 3 (chỉ thực hiện sau khi đã ổn ở giai đoạn 1 và 2): Tích hợp Ad Network Adapters (khuyến khích sử dụng Strategy Design pattern)

- [ ] **3.1. Thiết kế lớp trừu tượng (CTA Abstraction Layer)**
  - Cung cấp API chung trong code game: `window.installClick()`.
- [ ] **3.2. Viết Adapter Injector cho từng Network**
  - **AppLovin / Ironsource / Liftoff:** Nhúng script MRAID và gọi `mraid.open(storeUrl)`.
  - **Google Ads:** Khai báo exit component và gọi `ExitApi.exit()`.
  - **Mintegral:** Tích hợp `window.install()` và xử lý pause/resume audio (`window.gameStart()`, `window.gameClose()`).
  - **Unity Ads:** Xử lý `mraid.open()`.
  - **TikTok / Facebook:** Thêm logic pixel/CTA tracking tương ứng.
- [ ] **3.3. Tự động đóng gói theo cấu hình CLI**
  - Tham số dòng lệnh: `--network=applovin|ironsource|all`.
  - Khi chọn `all`, tự động xuất ra thư mục chứa từng file html riêng cho từng mạng quảng cáo.

---

## Giai đoạn 4 (sau khi đã xong standalone tool): Đóng gói thành Web UI (Kéo - Thả)

- [ ] **4.1. Chuyển đổi Core Engine sang Client-Side**
  - Tách rời hoàn toàn các API Node.js (như `fs`, `path`), sử dụng API Web chuẩn (`Blob`, `File`, `FileReader`, `URL.createObjectURL`).
  - Đảm bảo script core bundle chạy trơn tru trong môi trường Browser/Web Worker.
- [ ] **4.2. Xây dựng Giao diện Web (Frontend UI)**
  - **Dropzone:** Khu vực kéo thả file `.zip` bản build.
  - **Network Preset Checkbox:** Cho phép tick chọn các network cần tạo (AppLovin, IronSource, Google, Unity...).
  - **Compression / Quality Settings:** Tùy chọn nén chất lượng ảnh/âm thanh.
  - **Size Inspector:** Thanh đo tổng dung lượng file đầu ra.
  - **In-browser Previewer:** Khung `<iframe>` sandbox cho phép test gameplay và nút CTA trực tiếp sau khi convert.
  - **Download Center:** Nút tải file `.html` đơn lẻ hoặc gói `.zip` chứa toàn bộ biến thể.

---

## Giai đoạn 5: Tối ưu hóa & Nâng cấp (Performance Phase)
- [ ] **5.1. Hỗ trợ Asset Deduplication (Chống trùng lặp asset)**
  - So sánh hash SHA-256 các file ảnh/json giống nhau để chỉ lưu 1 bản Base64 duy nhất trong từ điển, giảm dung lượng file tổng thể.