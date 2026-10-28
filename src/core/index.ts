import { loadInput } from "../node/input.js";
import fs from 'fs';
import path from 'path';
import { packProjectCore, type PackOptions } from "./packer.js";
export * from "./packer.js";
export { normalizePath } from "./path.js";

export async function packProject(
    inputDir: string,
    outputDir: string,
    runtimeCode: string,
    networks: string = 'generic',
    options?: PackOptions
): Promise<string[]> {
    const vfs = await loadInput(inputDir);
    const outputs = packProjectCore(vfs, runtimeCode, networks, options);

    const outputFiles: string[] = [];

    for (const out of outputs) {
        let targetFile = path.join(outputDir, out.relativePath);

        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetFile, out.content, 'utf-8');
        outputFiles.push(targetFile);
    }

    return outputFiles;
}
