/// <reference lib="webworker" />
import type { WorkerBuildRequest, WorkerResponse } from './types.js';
import { loadBrowserZip } from '../browser/input.js';
import { packProjectCore } from '../core/packer.js';

export async function handleBuild(
    req: WorkerBuildRequest,
    post: (res: WorkerResponse) => void
): Promise<void> {
    try {
        post({ type: 'PROGRESS', step: 'Unzipping archive', percent: 20 });
        const vfs = await loadBrowserZip(req.zipBuffer);

        post({ type: 'PROGRESS', step: 'Packing playable', percent: 50 });
        const outputs = packProjectCore(vfs, req.runtimeCode, req.networks, { debug: req.debug });

        post({ type: 'PROGRESS', step: 'Done', percent: 100 });
        post({ type: 'SUCCESS', outputs });
    } catch (err) {
        post({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
    }
}
// Chỉ đăng ký listener khi thực sự chạy trong Worker (Node/Vitest không có `self`)
if (typeof self !== 'undefined') {
    self.onmessage = (e: MessageEvent<WorkerBuildRequest>) =>
        handleBuild(e.data, (res) => self.postMessage(res));
}
