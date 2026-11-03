# Stage 1: Biên dịch công cụ nén ảnh Rust (tiny-png)
FROM rust:1.80-slim AS rust-builder
WORKDIR /build

# Cài đặt công cụ build C cơ bản cho dependencies của imagequant / libdeflater
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev && rm -rf /var/lib/apt/lists/*

COPY vendor/tiny-png ./vendor/tiny-png
RUN cargo build --release --manifest-path vendor/tiny-png/Cargo.toml

# Stage 2: Môi trường chạy Playfuse (Node.js 20)
FROM node:20-slim
WORKDIR /app

# Cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Sao chép mã nguồn và binary Rust đã build
COPY . .
COPY --from=rust-builder /build/vendor/tiny-png/target/release/tiny-png /app/vendor/tiny-png/target/release/tiny-png

# Tạo runtime code và build bản phân phối
RUN npm run build && npm run web:build

EXPOSE 5174

# Mặc định khởi chạy Playfuse Web Studio
CMD ["npm", "run", "web", "--", "--host", "0.0.0.0"]
