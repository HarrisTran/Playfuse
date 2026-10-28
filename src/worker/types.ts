import type { PlayableOutputFile } from "../core/packer.js";

export interface WorkerBuildRequest {
    type: 'BUILD',
    zipBuffer: ArrayBuffer | Uint8Array,
    runtimeCode: string,
    networks?: string,
    debug?: boolean
}

export type WorkerResponse = 
    | { type: 'PROGRESS'; step: string; percent: number}
    | { type: 'SUCCESS', outputs: PlayableOutputFile[]}
    | { type: 'ERROR', error: string};
