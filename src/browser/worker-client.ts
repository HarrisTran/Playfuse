import type { WorkerBuildRequest, WorkerResponse } from '../worker/types.js';
import type { PlayableOutputFile } from '../core/packer.js';
import { DEFAULT_RUNTIME_CODE } from '../runtime/bundle.generated.js';

export class PlayfuseWorkerClient {
    private worker: Worker | null = null;
    private busy = false;

    private getWorker(): Worker {
        if (!this.worker) {
            this.worker = new Worker(
                new URL('../worker/packer.worker.ts', import.meta.url),
                { type: 'module' }
            );
        }
        return this.worker;
    }

    terminate(): void {
        this.worker?.terminate();
        this.worker = null;
        this.busy = false;
    }

    pack(
        zipBuffer: ArrayBuffer | Uint8Array,
        networks: string,
        debug: boolean = false,
        onProgress?: (step: string, percent: number) => void
    ): Promise<PlayableOutputFile[]> {
        if (this.busy) {
            return Promise.reject(new Error('A build is already running'));
        }
        this.busy = true;
        const worker = this.getWorker();

        // Luôn gửi một ArrayBuffer riêng, đúng vùng dữ liệu:
        // - Uint8Array có thể là view (byteOffset != 0) -> .buffer sẽ gửi thừa/sai dữ liệu
        // - Transfer sẽ detach buffer -> không được đụng vào buffer của caller
        const bytes = zipBuffer instanceof Uint8Array ? zipBuffer : new Uint8Array(zipBuffer);
        const buffer = bytes.slice().buffer as ArrayBuffer;

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                this.busy = false;
            };

            const onMessage = (e: MessageEvent<WorkerResponse>) => {
                const res = e.data;
                if (res.type === 'PROGRESS') {
                    onProgress?.(res.step, res.percent);
                } else if (res.type === 'SUCCESS') {
                    cleanup();
                    resolve(res.outputs);
                } else {
                    cleanup();
                    reject(new Error(res.error));
                }
            };

            const onError = (err: ErrorEvent) => {
                cleanup();
                // Worker lỗi ở mức script (load/syntax) thì không dùng lại được nữa
                this.terminate();
                reject(new Error(err.message || 'Worker crashed'));
            };

            worker.addEventListener('message', onMessage);
            worker.addEventListener('error', onError);

            const req: WorkerBuildRequest = {
                type: 'BUILD',
                zipBuffer: buffer,
                runtimeCode: DEFAULT_RUNTIME_CODE,
                networks,
                debug,
            };
            worker.postMessage(req, [buffer]);
        });
    }
}

export const workerClient = new PlayfuseWorkerClient();
