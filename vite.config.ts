import { defineConfig, type Plugin } from 'vite';
import os from 'node:os';

function lanPreviewPlugin(): Plugin {
  const previewStorage = new Map<string, string>();

  return {
    name: 'playfuse-lan-preview',
    configureServer(server) {
      // 1. Lưu bản build từ desktop client
      server.middlewares.use('/api/save-preview', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (Array.isArray(data.outputs)) {
                for (const item of data.outputs) {
                  previewStorage.set(item.network, item.content);
                }
              } else if (data.network && data.content) {
                previewStorage.set(data.network, data.content);
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });

      // 2. Trả về playable ad cho điện thoại khi quét QR
      server.middlewares.use('/preview', (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const net = url.searchParams.get('net') || 'google';
        const html = previewStorage.get(net);
        if (html) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } else {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Playfuse Live Preview</title>
  <style>
    body { background: #070a12; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; box-sizing: border-box; }
    .badge { background: rgba(0, 229, 255, 0.12); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em; }
    h2 { font-size: 20px; font-weight: 800; margin: 0 0 8px 0; color: #f8fafc; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0; max-width: 300px; }
    .icon { font-size: 40px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="icon">🎮</div>
  <div class="badge">${net.toUpperCase()}</div>
  <h2>Chưa có bản build</h2>
  <p>Vui lòng nhấn <b>BUILD PLAYABLE AD(S)</b> trên máy tính trước khi quét mã QR.</p>
</body>
</html>`);
        }
      });

      // 3. API cung cấp địa chỉ IP LAN của máy tính
      server.middlewares.use('/api/lan-ip', (_req, res) => {
        const nets = os.networkInterfaces();
        let lanIp = '127.0.0.1';
        for (const name of Object.keys(nets)) {
          for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
              lanIp = net.address;
              break;
            }
          }
          if (lanIp !== '127.0.0.1') break;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ip: lanIp, port: 5174 }));
      });
    },
  };
}

export default defineConfig({
  build: {
    outDir: 'dist-web',
  },
  worker: {
    format: 'es',
  },
  plugins: [lanPreviewPlugin()],
  server: {
    port: 5174,
    host: true, // Lắng nghe trên 0.0.0.0 để điện thoại cùng Wi-Fi truy cập được
  },
});
