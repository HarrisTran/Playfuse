# 📘 Kế Hoạch & Hướng Dẫn Thực Hiện: Bài 11 — Hiện Thực Adapter Từng Mạng & Batch Build

> **Học phần:** Module 5: Ad Network Adapters  
> **Mục tiêu:** Cài đặt các Strategy cụ thể cho các Ad Network hàng đầu thế giới (AppLovin, Google Ads, Mintegral) và nâng cấp CLI hỗ trợ chế độ xuất bản hàng loạt (**Batch Build** `--network=all`).

---

## 1. 📖 Lý Thuyết SDK Specs Từng Mạng Quảng Cáo

Mỗi Ad Network có tài liệu kỹ thuật (Developer Guidelines) với các ràng buộc khắt khe. Nếu vi phạm, ad sẽ bị hệ thống tự động từ chối (Reject) khi upload chiến dịch:

### 1.1. AppLovin & IronSource (Chuẩn MRAID v2/v3)
- **Tài liệu chuẩn:** [AppLovin Playable Specs](https://dash.applovin.com/documentation/sg/playable-ads)
- **Ràng buộc:**
  - Bắt buộc nhúng script MRAID trong `<head>`:
    ```html
    <script src="mraid.js"></script>
    ```
    *(Khi chạy trên app thật, WebView của AppLovin SDK sẽ tự động nạp file `mraid.js` ảo).*
  - **Hành vi CTA (`wrapCTA`):**
    Phải kiểm tra nếu đối tượng `mraid` tồn tại thì gọi `mraid.open(targetUrl)`, nếu không (khi preview trên web) thì fallback về `window.open(targetUrl, '_blank')`:
    ```javascript
    window.installClick = function(overrideUrl) {
      var target = overrideUrl || defaultUrl;
      if (typeof mraid !== 'undefined' && mraid.open) {
        mraid.open(target);
      } else {
        window.open(target, '_blank');
      }
    };
    ```

### 1.2. Google Ads (Google Playable Ads / HTML5)
- **Tài liệu chuẩn:** [Google Ads HTML5 Playable Specs](https://support.google.com/google-ads/answer/9924510)
- **Ràng buộc:**
  - Bắt buộc có thẻ meta kích thước và thư viện `exitapi.js` trong `<head>`:
    ```html
    <meta name="ad.size" content="width=320,height=480">
    <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>
    ```
  - **Hành vi CTA (`wrapCTA`):**
    Google cấm gọi `window.open` trực tiếp. Phải gọi thông qua `ExitApi.exit(targetUrl)`:
    ```javascript
    window.installClick = function(overrideUrl) {
      var target = overrideUrl || defaultUrl;
      if (typeof ExitApi !== 'undefined' && ExitApi.exit) {
        ExitApi.exit(target);
      } else {
        window.open(target, '_blank');
      }
    };
    ```

### 1.3. Mintegral
- **Tài liệu chuẩn:** [Mintegral Interactive Creative Guide](https://www.mintegral.com/en/support/creative-center)
- **Ràng buộc:**
  - **Hành vi CTA (`wrapCTA`):**
    Mintegral SDK cung cấp sẵn hàm `window.install(targetUrl)` trên môi trường native:
    ```javascript
    window.installClick = function(overrideUrl) {
      var target = overrideUrl || defaultUrl;
      if (typeof window.install === 'function') {
        window.install(target);
      } else if (typeof mraid !== 'undefined' && mraid.open) {
        mraid.open(target);
      } else {
        window.open(target, '_blank');
      }
    };
    ```
  - **Quản lý âm thanh / vòng đời game (`injectBody`):**
    Mintegral yêu cầu cung cấp sẵn 2 hàm toàn cục để SDK thông báo khi quảng cáo ẩn/hiện (để tắt/bật âm thanh):
    ```javascript
    window.gameStart = window.gameStart || function() { console.log('[Mintegral] Game Start'); };
    window.gameClose = window.gameClose || function() { console.log('[Mintegral] Game Close'); };
    ```

---

## 2. 🎯 Nhiệm Vụ Cần Làm (Workload & Steps)

### Bước 1: Viết `AppLovinAdapter`
Tạo file `src/core/adapters/applovin.ts`:
- `id: 'applovin'`
- `name: 'AppLovin / IronSource (MRAID)'`
- `injectHead()`: trả về `<script src="mraid.js"></script>`
- `wrapCTA(storeUrl)`: ưu tiên `mraid.open(target)`

### Bước 2: Viết `GoogleAdapter`
Tạo file `src/core/adapters/google.ts`:
- `id: 'google'`
- `name: 'Google Ads (ExitApi)'`
- `injectHead()`: trả về meta `ad.size` và link `exitapi.js`
- `wrapCTA(storeUrl)`: ưu tiên `ExitApi.exit(target)`

### Bước 3: Viết `MintegralAdapter`
Tạo file `src/core/adapters/mintegral.ts`:
- `id: 'mintegral'`
- `name: 'Mintegral'`
- `injectBody()`: sinh script định nghĩa `window.gameStart` và `window.gameClose`
- `wrapCTA(storeUrl)`: ưu tiên `window.install(target)`

### Bước 4: Đăng ký các adapter vào `NetworkRegistry`
Cập nhật `src/core/adapters/registry.ts` (hoặc `src/core/adapters/index.ts`):
- Đăng ký `generic`, `applovin`, `google`, `mintegral`.
- Export đầy đủ qua `src/core/adapters/index.ts`.

### Bước 5: Nâng cấp CLI & Batch Build (`--network=all`)
Cập nhật `src/core/index.ts` và `src/cli/index.ts`:
- Khi chọn `--network=all`:
  - Lặp qua tất cả adapter có trong `networkRegistry` (hoặc trừ adapter test nếu cần).
  - Xuất ra từng file tương ứng:
    - Nếu xuất vào thư mục: `<output-dir>/index_<network>.html`
    - Ví dụ: `output_cli/index_generic.html`, `output_cli/index_applovin.html`, `output_cli/index_google.html`, `output_cli/index_mintegral.html`.
- Cập nhật `--help` hiển thị rõ các lựa chọn: `generic | applovin | google | mintegral | all`.

---

## 3. 🧪 Bộ Test Cases Chuẩn Bị Sẵn

File test đã được chuẩn bị tại [tests/core/adapters-networks.test.ts](file:///Users/macbookpro/WebstormProjects/Playfuse/tests/core/adapters-networks.test.ts):
1. **Kiểm tra đăng ký đầy đủ**: `networkRegistry` chứa `generic`, `applovin`, `google`, `mintegral`.
2. **Kiểm tra AppLovin**: Có `mraid.js` trong head, `mraid.open` trong CTA.
3. **Kiểm tra Google Ads**: Có `exitapi.js` và `ad.size` trong head, `ExitApi.exit` trong CTA.
4. **Kiểm tra Mintegral**: Có `window.gameStart` / `window.gameClose` trong body, `window.install` trong CTA.
5. **Kiểm tra Batch Build (`all`)**: Sinh đủ các file HTML cho từng mạng quảng cáo.

---

## 4. ✅ Tiêu Chí Nghiệm Thu (Acceptance Criteria)

- [x] Tất cả adapter đều tuân thủ `AdNetworkAdapter` interface (Pure TypeScript).
- [x] Chạy lệnh `npx vitest run tests/core/adapters-networks.test.ts` pass 100%.
- [x] Chạy lệnh CLI build `all`:
  ```bash
  playfuse fixtures/cocos-3.8-basic/web-mobile output_cli --network all
  ```
  Tạo thành công 4 file HTML: `index_generic.html`, `index_applovin.html`, `index_google.html`, `index_mintegral.html` và mỗi file đều chứa đúng SDK script tương ứng.
