import QRCode from 'qrcode';
import type { PlayableOutputFile } from '../core/packer.js';

let cachedLanIp: string | null = null;
let currentPreviewUrl: string = '';

// Đồng bộ nội dung các bản build lên endpoint preview local của Vite
export async function syncPreviewToServer(outputs: PlayableOutputFile[]): Promise<void> {
    if (!outputs || outputs.length === 0) return;
    try {
        await fetch('/api/save-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                outputs: outputs.map(o => ({ network: o.network, content: o.content }))
            }),
        });
    } catch (e) {
        console.warn('[Playfuse QR] Không thể đồng bộ preview sang endpoint local:', e);
    }
}

// Lấy địa chỉ IP LAN của máy tính
async function getLanIp(): Promise<string> {
    if (cachedLanIp) return cachedLanIp;
    try {
        const res = await fetch('/api/lan-ip');
        if (res.ok) {
            const data = await res.json();
            if (data.ip && data.ip !== '127.0.0.1') {
                const ip = String(data.ip);
                cachedLanIp = ip;
                return ip;
            }
        }
    } catch {}
    
    // Fallback: nếu đang truy cập bằng IP thì dùng luôn hostname
    const host = window.location.hostname;
    return (host && host !== 'localhost' && host !== '127.0.0.1') ? host : '192.168.1.15';
}

// Khởi tạo các sự kiện cho Modal QR
export function initQrPreview(): void {
    const modal = document.getElementById('qrModal') as HTMLDivElement | null;
    const closeBtn = document.getElementById('closeQrModalBtn') as HTMLButtonElement | null;
    const backdrop = document.getElementById('qrModalBackdrop') as HTMLDivElement | null;
    const copyBtn = document.getElementById('copyQrLinkBtn') as HTMLButtonElement | null;

    const closeModal = () => {
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100', 'pointer-events-auto');
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('pointer-events-none')) {
            closeModal();
        }
    });

    if (copyBtn) {
        copyBtn.onclick = async () => {
            if (!currentPreviewUrl) return;
            try {
                await navigator.clipboard.writeText(currentPreviewUrl);
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = `<span class="material-symbols-outlined text-[14px]">done</span><span>Đã copy!</span>`;
                setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
            } catch {
                alert('Không thể tự động copy, vui lòng copy thủ công: ' + currentPreviewUrl);
            }
        };
    }
}

// Mở modal và vẽ mã QR Code
export async function openQrPreviewModal(
    networkId: string,
    outputs: PlayableOutputFile[],
    networkLabel?: string
): Promise<void> {
    const modal = document.getElementById('qrModal') as HTMLDivElement | null;
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement | null;
    const qrUrlText = document.getElementById('qrUrlText') as HTMLInputElement | null;
    const qrNetworkBadge = document.getElementById('qrNetworkBadge') as HTMLElement | null;

    if (!modal || !canvas) return;

    // Kiểm tra xem đã build ad network này chưa
    const hasBuild = outputs.some(o => o.network === networkId);
    if (!hasBuild) {
        alert(`Chưa có bản build cho ${networkLabel || networkId}. Vui lòng nhấn "BUILD PLAYABLE AD(S)" trước khi quét QR.`);
        return;
    }

    // Đảm bảo dữ liệu mới nhất đã được gửi lên endpoint
    syncPreviewToServer(outputs);

    // Tính toán URL mạng LAN
    const lanIp = await getLanIp();
    const port = window.location.port || '5174';
    currentPreviewUrl = `http://${lanIp}:${port}/preview?net=${encodeURIComponent(networkId)}`;

    if (qrNetworkBadge) {
        qrNetworkBadge.textContent = networkLabel || networkId.toUpperCase();
    }
    if (qrUrlText) {
        qrUrlText.value = currentPreviewUrl;
    }

    // Sinh mã QR trực tiếp vào thẻ canvas
    try {
        await QRCode.toCanvas(canvas, currentPreviewUrl, {
            width: 210,
            margin: 1.5,
            color: {
                dark: '#090e1a',
                light: '#ffffff',
            },
        });
    } catch (err) {
        console.error('[Playfuse QR] Lỗi sinh mã QR:', err);
    }

    // Hiển thị modal
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
}
