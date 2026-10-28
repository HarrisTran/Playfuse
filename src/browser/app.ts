import { workerClient } from './worker-client.js';
import { createZipBundle, downloadBlob } from './export.js';
import { initQrPreview, openQrPreviewModal, syncPreviewToServer } from './qr-preview.js';
import type { PlayableOutputFile } from '../core/packer.js';

interface NetworkConfig {
    id: string;
    label: string;
    svgColor: string;
    icon: string;
}

const NETWORKS: NetworkConfig[] = [
    { id: 'google', label: 'Google Ads', svgColor: '#EA4335', icon: '/icons/google_ads.png' },
    { id: 'applovin', label: 'AppLovin', svgColor: '#0E71EB', icon: '/icons/applovin.png' },
    { id: 'mintegral', label: 'Mintegral', svgColor: '#00D182', icon: '/icons/mintegral.png' },
    { id: 'generic', label: 'Generic MRAID', svgColor: '#10B981', icon: '/icons/mraid.png' },
];

let selectedNetworks = new Set<string>(['google', 'applovin', 'generic']);
let stagedFile: File | null = null;
let currentOutputs: PlayableOutputFile[] = [];
let activePreviewNetwork: string = 'google';
let currentBlobUrl: string | null = null;

// DOM Elements
const dropzoneContainer = document.getElementById('dropzoneContainer') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const stagedFileInfo = document.getElementById('stagedFileInfo') as HTMLDivElement;
const stagedFileName = document.getElementById('stagedFileName') as HTMLSpanElement;
const stagedFileSize = document.getElementById('stagedFileSize') as HTMLSpanElement;
const removeFileBtn = document.getElementById('removeFileBtn') as HTMLButtonElement;
const btnSelectAll = document.getElementById('btnSelectAll') as HTMLButtonElement;
const networksContainer = document.getElementById('networksContainer') as HTMLDivElement;
const btnBuild = document.getElementById('btnBuild') as HTMLButtonElement;

// Progress
const progressCard = document.getElementById('progressCard') as HTMLDivElement;
const progressPercent = document.getElementById('progressPercent') as HTMLSpanElement;
const progressStep = document.getElementById('progressStep') as HTMLSpanElement;
const progressBar = document.getElementById('progressBar') as HTMLDivElement;

// Size Inspector & Export
const sizeInspectorList = document.getElementById('sizeInspectorList') as HTMLDivElement;
const btnDownloadAll = document.getElementById('btnDownloadAll') as HTMLButtonElement;

// Phone Simulator
const phoneBezel = document.getElementById('phoneBezel') as HTMLDivElement;
const gameIframe = document.getElementById('gameIframe') as HTMLIFrameElement;
const iframePlaceholder = document.getElementById('iframePlaceholder') as HTMLDivElement;
const btnPortrait = document.getElementById('btnPortrait') as HTMLButtonElement | null;
const btnReload = document.getElementById('btnReload') as HTMLButtonElement | null;
const btnScanQr = document.getElementById('btnScanQr') as HTMLButtonElement | null;
const ctaTestToast = document.getElementById('ctaTestToast') as HTMLDivElement;
const toastTitle = document.getElementById('toastTitle') as HTMLSpanElement;
const toastMessage = document.getElementById('toastMessage') as HTMLSpanElement;

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// Render network selection chips
function renderNetworkChips() {
    networksContainer.innerHTML = '';
    for (const net of NETWORKS) {
        const isSelected = selectedNetworks.has(net.id);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `network-chip flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all text-left text-xs ${
            isSelected
                ? 'bg-cyan-950/35 border-2 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.25)] font-bold'
                : 'bg-[#101726] border border-white/10 text-slate-300 hover:border-white/25 hover:text-white font-medium'
        }`;

        chip.innerHTML = `
            <span class="w-5 h-5 flex items-center justify-center shrink-0 rounded-md overflow-hidden bg-white shadow-sm p-0.5 border border-white/20">
                <img src="${net.icon}" alt="${net.label}" class="w-full h-full object-contain" />
            </span>
            <span>${net.label}</span>
            <span class="material-symbols-outlined text-[15px] ${isSelected ? 'text-cyan-400 font-bold' : 'text-slate-600'} ml-0.5">
                ${isSelected ? 'check' : 'radio_button_unchecked'}
            </span>
        `;

        chip.onclick = () => {
            if (selectedNetworks.has(net.id)) {
                if (selectedNetworks.size > 1) {
                    selectedNetworks.delete(net.id);
                }
            } else {
                selectedNetworks.add(net.id);
            }
            renderNetworkChips();
        };

        networksContainer.appendChild(chip);
    }
}

// Drag & Drop handlers
dropzoneContainer.addEventListener('click', (e) => {
    if (e.target !== removeFileBtn && !removeFileBtn.contains(e.target as Node)) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
        handleSelectedFile(fileInput.files[0]);
    }
});

['dragenter', 'dragover'].forEach(name => {
    dropzoneContainer.addEventListener(name, (e) => {
        e.preventDefault();
        dropzoneContainer.classList.add('drag-active');
    });
});

['dragleave', 'drop'].forEach(name => {
    dropzoneContainer.addEventListener(name, (e) => {
        e.preventDefault();
        dropzoneContainer.classList.remove('drag-active');
    });
});

dropzoneContainer.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
        handleSelectedFile(dt.files[0]);
    }
});

function handleSelectedFile(file: File) {
    if (!file.name.endsWith('.zip')) {
        alert('Vui lòng chọn file định dạng .zip của bản build Cocos Creator web-mobile.');
        return;
    }
    stagedFile = file;
    stagedFileName.textContent = file.name;
    stagedFileSize.textContent = formatBytes(file.size);
    stagedFileInfo.classList.remove('hidden');
    stagedFileInfo.classList.add('flex');
    btnBuild.disabled = false;
    btnBuild.classList.remove('opacity-40', 'cursor-not-allowed');
}

removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stagedFile = null;
    fileInput.value = '';
    stagedFileInfo.classList.add('hidden');
    stagedFileInfo.classList.remove('flex');
    btnBuild.disabled = true;
    btnBuild.classList.add('opacity-40', 'cursor-not-allowed');
});

btnSelectAll.addEventListener('click', () => {
    if (selectedNetworks.size === NETWORKS.length) {
        selectedNetworks = new Set(['google']);
    } else {
        selectedNetworks = new Set(NETWORKS.map(n => n.id));
    }
    renderNetworkChips();
});

// Build Action
btnBuild.addEventListener('click', async () => {
    if (!stagedFile) return;

    btnBuild.disabled = true;
    btnBuild.classList.add('opacity-40', 'cursor-not-allowed');
    progressBar.style.backgroundColor = '';
    progressBar.style.width = '10%';
    progressPercent.textContent = '10%';
    progressStep.textContent = 'Reading archive buffer...';

    try {
        const buffer = await stagedFile.arrayBuffer();
        const networkString = Array.from(selectedNetworks).join(',');

        const outputs = await workerClient.pack(
            buffer,
            networkString,
            false,
            (step, percent) => {
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
                progressStep.textContent = step;
            }
        );

        currentOutputs = outputs;
        renderSizeInspector(outputs);
        syncPreviewToServer(outputs);

        // Auto preview the first output
        if (outputs.length > 0) {
            activePreviewNetwork = outputs[0]!.network;
            previewNetwork(activePreviewNetwork);
        }

        btnDownloadAll.disabled = false;
        btnDownloadAll.classList.remove('opacity-40', 'cursor-not-allowed');

        setTimeout(() => {
            progressStep.textContent = 'Build completed successfully!';
        }, 500);

    } catch (err: any) {
        alert('Build thất bại: ' + (err.message || String(err)));
        progressStep.textContent = 'Build Error: ' + (err.message || String(err));
        progressBar.style.backgroundColor = '#ef4444';
    } finally {
        btnBuild.disabled = false;
        btnBuild.classList.remove('opacity-40', 'cursor-not-allowed');
    }
});

// Size Inspector: displays built ad sizes; clicking a row switches the preview in simulator
function renderSizeInspector(outputs: PlayableOutputFile[]) {
    sizeInspectorList.innerHTML = '';
    for (const out of outputs) {
        const size = new TextEncoder().encode(out.content).length;
        const sizeFormatted = formatBytes(size);
        const isWarning = size > 5 * 1024 * 1024; // >5MB
        const isActive = activePreviewNetwork === out.network;

        const row = document.createElement('div');
        row.className = `flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
            isActive
                ? 'bg-amber-950/25 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.15)] text-amber-200'
                : 'bg-[#121a2a] border-white/5 hover:bg-[#162238] text-slate-300'
        }`;

        const netConfig = NETWORKS.find(n => n.id === out.network);
        const label = netConfig ? netConfig.label : out.network;
        const iconUrl = netConfig ? netConfig.icon : '/icons/mraid.png';

        row.innerHTML = `
            <div class="flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-md bg-white flex items-center justify-center p-0.5 overflow-hidden shadow-sm shrink-0 border border-white/20">
                    <img src="${iconUrl}" alt="${label}" class="w-full h-full object-contain" />
                </span>
                <div class="flex flex-col">
                    <span class="text-xs font-bold leading-tight ${isActive ? 'text-amber-200' : 'text-white'}">${label}: ${sizeFormatted}</span>
                    <span class="text-[10px] text-slate-400 leading-tight">Target &lt; 5MB</span>
                </div>
            </div>
            <div class="flex items-center gap-1.5">
                ${isWarning 
                    ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-500/30"><span class="material-symbols-outlined text-[12px]">warning</span> &gt;5MB</span>`
                    : `<span class="text-emerald-400 text-xs font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[15px]">check_circle</span> OK</span>`
                }
                <button type="button" class="p-1 text-slate-400 hover:text-cyan-400 transition-colors download-single-btn" title="Download this file">
                    <span class="material-symbols-outlined text-[15px]">download</span>
                </button>
            </div>
        `;

        row.onclick = (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.download-single-btn')) {
                e.stopPropagation();
                downloadBlob(out.content, `index_${out.network}.html`, 'text/html');
                return;
            }
            activePreviewNetwork = out.network;
            renderSizeInspector(currentOutputs);
            previewNetwork(out.network);
        };

        sizeInspectorList.appendChild(row);
    }
}

// Preview Simulator probe: intercepts CTA events, communicates with parent, and prevents new tabs
function withCtaProbe(html: string, networkId: string): string {
    const probe = `<script>
(function() {
  function sendCta(via, url) {
    console.log('[Playfuse Simulator] CTA Click triggered via:', via, url);
    // 1. Direct parent call (synchronous, 100% reliable)
    try {
      if (window.parent && typeof window.parent.__PLAYFUSE_TRIGGER_CTA__ === 'function') {
        window.parent.__PLAYFUSE_TRIGGER_CTA__(${JSON.stringify(networkId)}, via, url || '');
      }
    } catch (e) {}

    // 2. Direct top call
    try {
      if (window.top && typeof window.top.__PLAYFUSE_TRIGGER_CTA__ === 'function') {
        window.top.__PLAYFUSE_TRIGGER_CTA__(${JSON.stringify(networkId)}, via, url || '');
      }
    } catch (e) {}

    // 3. postMessage fallbacks
    try {
      window.parent.postMessage({
        type: 'PLAYFUSE_CTA_CLICK',
        network: ${JSON.stringify(networkId)},
        via: via,
        url: url || ''
      }, '*');
    } catch (e) {}
    try {
      window.top.postMessage({
        type: 'PLAYFUSE_CTA_CLICK',
        network: ${JSON.stringify(networkId)},
        via: via,
        url: url || ''
      }, '*');
    } catch (e) {}
  }

  // Intercept window.installClick (used across Cocos playable ads)
  window.installClick = function(overrideUrl) {
    var target = overrideUrl || '';
    sendCta('installClick', target);
    // In simulator mode, do NOT forward to origInstallClick to prevent real window.open
  };

  // Intercept window.open - strictly prevent opening a new browser tab in simulation mode
  window.open = function(url, target, feat) {
    sendCta('window.open', url || '');
    return null;
  };

  // Mock / Intercept MRAID for AppLovin and Generic MRAID
  window.mraid = window.mraid || {};
  window.mraid.open = function(url) {
    sendCta('mraid.open', url || '');
  };
  window.mraid.getState = window.mraid.getState || function() { return 'default'; };
  window.mraid.addEventListener = window.mraid.addEventListener || function() {};
  window.mraid.removeEventListener = window.mraid.removeEventListener || function() {};
  window.mraid.isViewable = window.mraid.isViewable || function() { return true; };

  // Mock / Intercept Google ExitApi
  window.ExitApi = window.ExitApi || {};
  window.ExitApi.exit = function(url) {
    sendCta('ExitApi.exit', url || '');
  };

  // Mock Mintegral window.install
  window.install = function(url) {
    sendCta('window.install', url || '');
  };

  // Intercept any <a> tag clicks inside iframe
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A' && el !== document.body) {
      el = el.parentElement;
    }
    if (el && el.tagName === 'A') {
      e.preventDefault();
      e.stopPropagation();
      sendCta('link.click', el.getAttribute('href') || '');
    }
  }, true);
})();
</script>`;

    const idx = html.lastIndexOf('</body>');
    return idx === -1 ? html + probe : html.slice(0, idx) + probe + html.slice(idx);
}

let adLoadStartTime = Date.now();

function previewNetwork(networkId: string) {
    const file = currentOutputs.find(o => o.network === networkId);
    if (!file) return;

    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
    }

    adLoadStartTime = Date.now();
    const blob = new Blob([withCtaProbe(file.content, networkId)], { type: 'text/html' });
    currentBlobUrl = URL.createObjectURL(blob);

    iframePlaceholder.classList.add('hidden');
    gameIframe.classList.remove('hidden');
    gameIframe.src = currentBlobUrl;
    // NOTE: Do not show CTA Click Toast when simply previewing/switching ad network!
}

// Portrait Orientation & Reload
if (btnPortrait) {
    btnPortrait.addEventListener('click', () => {
        phoneBezel.style.width = '335px';
        phoneBezel.style.height = '660px';
    });
}

if (btnReload) {
    btnReload.addEventListener('click', () => {
        if (gameIframe.src) {
            adLoadStartTime = Date.now();
            gameIframe.src = gameIframe.src;
        }
    });
}

if (btnScanQr) {
    btnScanQr.addEventListener('click', () => {
        const netConfig = NETWORKS.find(n => n.id === activePreviewNetwork);
        const label = netConfig ? netConfig.label : activePreviewNetwork;
        openQrPreviewModal(activePreviewNetwork, currentOutputs, label);
    });
}

// CTA Toast notification (triggered ONLY when player actually clicks CTA inside the playable ad)
let lastCtaTriggerTime = 0;
let ctaToastTimeout: any = null;

function showCtaToast(network: string, via: string, url: string) {
    const now = Date.now();
    // Throttling: ignore duplicate triggers within 350ms
    if (now - lastCtaTriggerTime < 350) {
        return;
    }
    lastCtaTriggerTime = now;

    console.log('[Playfuse Studio] showCtaToast triggered:', { network, via, url });

    if (toastTitle) {
        toastTitle.textContent = 'CTA Click Test: SUCCESSFUL.';
    }
    if (toastMessage) {
        const elapsedMs = Math.max(0, now - adLoadStartTime);
        const seconds = Math.floor(elapsedMs / 1000);
        const ms = (elapsedMs % 1000).toString().padStart(2, '0').slice(0, 2);
        const timeStr = `${seconds}s:${ms}ms`;
        const netName = (network || activePreviewNetwork).toUpperCase();
        toastMessage.textContent = `Log: event_cta_click captured [${netName}] @ ${timeStr}.`;
    }

    if (url && ctaTestToast) {
        ctaTestToast.title = `Destination: ${url}`;
    }

    // Force visible display and transition
    ctaTestToast.style.display = 'flex';
    void ctaTestToast.offsetWidth; // Trigger reflow
    ctaTestToast.style.opacity = '1';
    ctaTestToast.style.transform = 'translateY(0)';
    ctaTestToast.style.pointerEvents = 'auto';
    ctaTestToast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    ctaTestToast.classList.add('translate-y-0', 'opacity-100');

    if (ctaToastTimeout) clearTimeout(ctaToastTimeout);
    ctaToastTimeout = setTimeout(() => {
        ctaTestToast.style.opacity = '0';
        ctaTestToast.style.transform = 'translateY(96px)';
        ctaTestToast.style.pointerEvents = 'none';
        ctaTestToast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        ctaTestToast.classList.remove('translate-y-0', 'opacity-100');
    }, 4500);
}

// Expose global handler on window for direct iframe calls
(window as any).__PLAYFUSE_TRIGGER_CTA__ = showCtaToast;

// Direct hook on iframe contentWindow upon load (bulletproof fallback)
gameIframe.addEventListener('load', () => {
    try {
        const win = gameIframe.contentWindow as any;
        if (!win) return;

        // Share the trigger function directly into iframe's window scope
        win.__PLAYFUSE_TRIGGER_CTA__ = showCtaToast;

        // Hook win.installClick directly on the loaded iframe window
        win.installClick = function(overrideUrl: any) {
            console.log('[Playfuse Studio] Direct iframe hook: installClick called with', overrideUrl);
            showCtaToast(activePreviewNetwork, 'installClick', overrideUrl || '');
        };

        // Hook win.open directly (never open a new tab)
        win.open = function(url: string, target?: string, feat?: string) {
            console.log('[Playfuse Studio] Direct iframe hook: window.open called with', url);
            showCtaToast(activePreviewNetwork, 'window.open', url || '');
            return null;
        };

        // Hook mraid directly
        win.mraid = win.mraid || {};
        win.mraid.open = function(url: string) {
            console.log('[Playfuse Studio] Direct iframe hook: mraid.open called with', url);
            showCtaToast(activePreviewNetwork, 'mraid.open', url || '');
        };
        win.mraid.getState = win.mraid.getState || (() => 'default');
        win.mraid.addEventListener = win.mraid.addEventListener || (() => {});
        win.mraid.removeEventListener = win.mraid.removeEventListener || (() => {});
        win.mraid.isViewable = win.mraid.isViewable || (() => true);

        // Hook ExitApi directly for Google Ads
        win.ExitApi = win.ExitApi || {};
        win.ExitApi.exit = function(url: string) {
            console.log('[Playfuse Studio] Direct iframe hook: ExitApi.exit called with', url);
            showCtaToast(activePreviewNetwork, 'ExitApi.exit', url || '');
        };

        // Hook Mintegral install
        win.install = function(url: string) {
            console.log('[Playfuse Studio] Direct iframe hook: install called with', url);
            showCtaToast(activePreviewNetwork, 'window.install', url || '');
        };

        // Intercept link clicks in iframe document
        try {
            win.document.addEventListener('click', (e: MouseEvent) => {
                let target = e.target as HTMLElement | null;
                while (target && target.tagName !== 'A' && target !== win.document.body) {
                    target = target.parentElement;
                }
                if (target && target.tagName === 'A') {
                    e.preventDefault();
                    e.stopPropagation();
                    const href = (target as HTMLAnchorElement).href || '';
                    showCtaToast(activePreviewNetwork, 'link.click', href);
                }
            }, true);
        } catch(e) {}

    } catch (e) {
        console.warn('[Playfuse Studio] Cannot attach direct hooks to gameIframe:', e);
    }
});

// Download Handlers: Single ZIP for All Ad Networks
btnDownloadAll.addEventListener('click', () => {
    if (currentOutputs.length === 0) return;
    const zipBytes = createZipBundle(currentOutputs);
    downloadBlob(zipBytes, 'playfuse_creatives.zip', 'application/zip');
});

// Listen to postMessage from game iframe for CTA test click
window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data;
    if (data && typeof data === 'object' && data.type === 'PLAYFUSE_CTA_CLICK') {
        showCtaToast(data.network || activePreviewNetwork, data.via || 'installClick', data.url || '');
    } else if (typeof data === 'string' && data.includes('PLAYFUSE_CTA_CLICK')) {
        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'PLAYFUSE_CTA_CLICK') {
                showCtaToast(parsed.network || activePreviewNetwork, parsed.via || 'installClick', parsed.url || '');
            }
        } catch(e){}
    }
});

// Initial render
renderNetworkChips();
initQrPreview();
