# Playfuse

Công cụ đóng gói bản build `web-mobile` từ **Cocos Creator 3.x** thành **1 file HTML duy nhất** phục vụ chạy quảng cáo tương tác (Playable Ads). Hỗ trợ cả CLI và Web.

---

## 🌐 Các Ad Network Đang Hỗ Trợ

| Ad Network |
|---|
| Google Ads |
| AppLovin |
| Mintegral |
| Generic MRAID |

---

## 🛠️ Techstack

* **TypeScript, Rust**
* **Rust Image Optimizer (`tiny-png` Submodule):** Tối ưu png với Rust sử dụng `imagequant` (nén lossy giảm palette màu 8-bit) và `oxipng` (nén lossless tối ưu Deflate & gỡ bỏ EXIF).
* **Nén nhị phân (`fflate`):** Giải nén và đóng gói zip nhị phân tốc độ cao trong RAM.
* **Giao diện Web UI:** HTML5, Tailwind CSS, Vite, Web Worker client-side.
* **Kiểm thử tự động (`Vitest`)** 

---

## 🚀 Hướng Dẫn Sử Dụng

### 1. Chạy bằng Docker

```bash
git clone --recurse-submodules https://github.com/HarrisTran/Playfuse.git
cd Playfuse

# Build image
docker build -t playfuse .

# Khởi chạy Web Studio (truy cập http://localhost:5174)
docker run -p 5174:5174 playfuse
```

---

### 2. Chạy trực tiếp (Local)


```bash
git clone --recurse-submodules https://github.com/HarrisTran/Playfuse.git
cd Playfuse
npm install

# Khởi chạy Web Studio
npm run web
```

### 3. Sử dụng qua CLI (Đóng gói từ Terminal)

```bash
# Đóng gói cơ bản ra file generic index.html
npm run dev -- <đường-dẫn-folder-hoặc-zip> <thư-mục-output>

# Đóng gói với Ad Network cụ thể (ví dụ: google, applovin, mintegral, hoặc all)
npm run dev -- ./build/web-mobile ./dist --network google,applovin

# Bật tính năng nén ảnh texture
npm run dev -- ./build/web-mobile ./dist --compress --q-lossy 80
```