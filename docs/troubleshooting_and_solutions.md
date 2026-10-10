# Playfuse: Hành trình từ Lý thuyết đến Thực tiễn (Xử lý Single-File HTML cho Cocos Creator)

Quá trình chuyển đổi một dự án Cocos Creator phức tạp thành một file HTML duy nhất (Playable Ad) nghe có vẻ đơn giản về mặt lý thuyết: "Chỉ cần mã hóa tất cả file thành Base64 và chặn hàm fetch/XHR là xong". 

Tuy nhiên, trong thực tế, các Engine Game phức tạp (như Cocos và thư viện SystemJS đi kèm) sử dụng rất nhiều luồng và phương thức tải tài nguyên khác nhau, lách qua hoàn toàn các giới hạn chặn cơ bản.

Dưới đây là tổng hợp 5 vấn đề hóc búa nhất đã gặp phải, nguyên nhân đằng sau và cách khắc phục triệt để bằng cách can thiệp sâu vào DOM và JavaScript Runtime.

---

## 1. Lỗi Cú Pháp (SyntaxError) do hàm `String.prototype.replace`

### Lý thuyết
Để nhúng mã nguồn JS/CSS/Base64 vào HTML, chúng ta tìm thẻ `</body>` và thay thế nó bằng `mã_nguồn + '</body>'` thông qua hàm:
`html.replace('</body>', code + '</body>')`

### Thực tế
Khi chạy file HTML, trình duyệt báo lỗi `SyntaxError: Invalid regular expression flags`.
Nguyên nhân là do Javascript Engine quy định các ký tự như `$$`, `$&`, `$'`,... trong chuỗi thay thế của hàm `replace` là **các cú pháp thay thế đặc biệt** (ví dụ `$&` sẽ được thay bằng chính chuỗi đang tìm kiếm). Vì source code game (nằm trong biến `code`) ngẫu nhiên chứa các ký tự này, lệnh `replace` đã làm phá hỏng toàn bộ mã nguồn.

### Cách khắc phục
Không truyền chuỗi trực tiếp, mà dùng hàm Callback (Arrow function) để `replace` bỏ qua toàn bộ việc phân tích cú pháp đặc biệt:
```typescript
html.replace('</body>', () => code + '</body>')
```

---

## 2. SystemJS "lách" qua Network Hooks bằng thẻ `<script>`

### Lý thuyết
Đã ghi đè `window.fetch` và `window.XMLHttpRequest` để bắt tất cả các network request. Cocos dùng SystemJS để import module (`System.import`). Đáng lẽ module phải được tải qua `fetch`.

### Thực tế
Trình duyệt báo lỗi `SystemJS Error #3` và `404 Not Found` cho file `index.js`.
Lý do: SystemJS mặc định không dùng `fetch`. Nó dùng cách tạo động thẻ `<script src="index.js">` và đính vào DOM. Trình duyệt sẽ tự động gọi mạng để tải file trong thuộc tính `src`, hoàn toàn lách qua 2 hook `fetch` và `XHR`.

### Cách khắc phục
Không thể sửa source code của SystemJS, nên chúng ta **tiêm một Hook trực tiếp vào Prototype của SystemJS** ngay khi nó vừa khởi tạo xong:
- Ghi đè hàm `System.constructor.prototype.shouldFetch`.
- Ép hàm này trả về `true` đối với tất cả các file có trong từ điển `__assetsMap__`.
- Khi `shouldFetch` = true, SystemJS sẽ không tạo thẻ `<script>` nữa mà chuyển sang gọi hàm `fetch` nội bộ của nó. Và vì `fetch` nội bộ đã bị chúng ta "đánh tráo" từ trước (Giai đoạn Runtime Injection), nó sẽ tải thành công code JS từ bộ nhớ Base64!

---

## 3. Hệ lụy vỡ đường dẫn của thư viện `import-map.json`

### Lý thuyết
Cocos sử dụng `src/import-map.json` để khai báo vị trí các file hệ thống, ví dụ: `"cc": "./../cocos-js/cc.js"`. 
Để tối ưu file HTML, chúng ta đã xoá hết các thẻ script gọi file bên ngoài, và nhúng thẳng nội dung `import-map.json` vào HTML qua dạng `<script type="systemjs-importmap">`.

### Thực tế
SystemJS báo lỗi `Error: cc ... (SystemJS Error #8)` (Không tìm thấy module `cc`).
Nguyên nhân: Trong dự án gốc, file `import-map.json` nằm trong thư mục `src/`. Do đó, đường dẫn `"./../cocos-js/cc.js"` (nhảy lùi ra ngoài 1 thư mục) là hoàn toàn chính xác. 
Nhưng khi chúng ta nhúng (inline) nội dung đó thẳng vào `index.html` (nằm ở thư mục gốc), SystemJS sẽ lấy `index.html` làm gốc. Đường dẫn `"./../"` sẽ lùi nhầm ra ngoài project gốc, dẫn đến địa chỉ vật lý bị sai hoàn toàn so với khóa trong `__assetsMap__`.

### Cách khắc phục
Viết một logic tự động đọc, phân tích và **chuẩn hóa (resolve) lại toàn bộ đường dẫn** bên trong `import-map.json` bằng Node.js trước khi tiêm vào HTML:
- Lấy đường dẫn gốc của `import-map.json` làm base (ví dụ `src/`).
- Cộng dồn base với đường dẫn relative (`./../`).
- Biến đổi tất cả thành đường dẫn tĩnh (VD: `"./cocos-js/cc.js"`), khớp 100% với khóa trong `__assetsMap__`.

---

## 4. Cocos Engine tự gọi thẻ DOM ẩn (`<script>`, `<img>`)

### Lý thuyết
Với việc đã chặn SystemJS và XHR/Fetch, toàn bộ tài nguyên game được cho là đã an toàn trong vùng kìm tỏa của Base64.

### Thực tế
Console vẫn xuất hiện lỗi `GET assets/internal/index.js net::ERR_ABORTED 404 (Not Found)`.
Nguyên nhân: Bản thân mã nguồn cốt lõi của Cocos (`cc.js`) tự động gọi lệnh `document.createElement('script')` (để tải asset bundle) hoặc `new Image()` (để tải ảnh), sau đó gán cứng thuộc tính `src = "đường_dẫn"`. Trình duyệt lập tức tung HTTP Request ra mạng trước khi file JS tải xong, dẫn tới lỗi 404.

### Cách khắc phục
Áp dụng phương pháp đánh chặn cấp độ DOM (DOM Hijacking). Chúng ta tiến hành ghi đè (Override) thuộc tính Setter `src` của mọi Element trên trình duyệt:
- `HTMLScriptElement.prototype.src`
- `HTMLImageElement.prototype.src`
- `HTMLAudioElement.prototype.src`
- `Element.prototype.setAttribute('src', ...)`

Mỗi khi Cocos có ý định gán đường dẫn vật lý, Setter bị chặn lại. Trình kiểm tra sẽ tra cứu trong `__assetsMap__`, nếu có, nó lập tức gán Data URI Base64 khổng lồ vào thuộc tính `src`. Trình duyệt bị "đánh lừa" và tải trực tiếp từ bộ nhớ RAM.

---

## 5. CSS Engine tự động load Font qua lệnh `@font-face`

### Lý thuyết
Cocos sử dụng API Font mặc định để tải `.ttf`, có thể chặn bằng DOM Hijacking.

### Thực tế
Font `.ttf` không thể load được (`PoetsenOne-Regular.ttf` bị 404).
Nguyên nhân: Cocos không tải Font bằng XHR, thẻ `<img>` hay API `window.FontFace` như thông thường. Thay vào đó, nó tạo một thẻ `<style>` rỗng, gán một chuỗi CSS `@font-face { src: url(...) }` vào thuộc tính `textContent`, rồi nhét vào `document.head`. CSS Parser của trình duyệt tự động thực thi và bóc tách `url(...)` để tải HTTP. Hook DOM/JS của chúng ta hoàn toàn "mù" trước hành vi của CSS.

### Cách khắc phục
Căng lưới chặn ở mọi thao tác sửa đổi thẻ `<style>`. 
Ghi đè hàm khởi tạo `document.createElement`:
- Nếu thẻ tạo ra là `style`, tiến hành bắt (hook) các phương thức: `appendChild`, `Node.prototype.textContent`, và `Element.prototype.innerHTML`.
- Khi Cocos gán chuỗi CSS vào, hàm đánh chặn sẽ dùng RegEx `/url\(['"]?(.*?)['"]?\)/g` để quét tất cả các URL bên trong nội dung.
- Đường dẫn vật lý của font sẽ bị tráo thành Base64 Data URI ngay trong chuỗi CSS.
- Kết quả: Khi trình duyệt xử lý CSS, nó đọc được Base64 và không cần bắn HTTP Request ra ngoài mạng lưới. Mọi font chữ được render hoàn hảo.

---

## Kết luận
Biến dự án Cocos thành Playable HTML là cuộc chiến đánh lừa trình duyệt trên mọi mặt trận: **Network (Fetch/XHR)**, **Module Loader (SystemJS)**, **DOM API (src/setAttribute)**, và cả **CSS Engine (textContent/URL regex)**. Bằng việc phối hợp nhiều tầng Hook khác nhau trong Runtime, Playfuse đảm bảo 100% môi trường kín kẽ, giúp game chạy trơn tru trong một file HTML duy nhất.
