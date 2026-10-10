#!/usr/bin/env node
import { getVersion } from './version.js';
import { packProject } from '../core/index.js';
import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('-v') || args.includes('--version')) {
        console.log(getVersion());
        return;
    }

    if (args.includes('-h') || args.includes('--help') || args.length === 0) {
        console.log(`
${getVersion()}
Usage: playfuse <input-path> <output-path>

Arguments:
  <input-path>   Path to Cocos Creator build folder or .zip file
  <output-path>  Path to output .html file or output directory

Options:
  -v, --version  Show version number
  -h, --help     Show help
`);
        return;
    }

    const positionalArgs = args.filter((a) => !a.startsWith('-'));
    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1];

    if (!inputPath) {
        throw new Error('No input path provided');
    }
    if (!outputPath) {
        throw new Error('No output path provided');
    }

    // Resolve runtime index.ts
    let runtimeEntry = fileURLToPath(new URL('../runtime/index.ts', import.meta.url));
    if (!fs.existsSync(runtimeEntry)) {
        runtimeEntry = fileURLToPath(new URL('../../src/runtime/index.ts', import.meta.url));
    }

    console.log(`[Playfuse] Bundling runtime hooks...`);
    const buildResult = await esbuild.build({
        entryPoints: [runtimeEntry],
        bundle: true,
        write: false,
        target: 'es2015',
        format: 'iife',
    });
    const runtimeCode = buildResult.outputFiles[0]!.text;

    console.log(`[Playfuse] Packing project from: ${inputPath}`);
    const outputFile = await packProject(inputPath, outputPath, runtimeCode);
    const stats = fs.statSync(outputFile);
    const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`[Playfuse] Successfully generated single-file playable ad:`);
    console.log(`           -> ${outputFile} (${sizeInMb} MB / ${stats.size} bytes)`);
}

main().catch((err) => {
    console.error('[Playfuse Error]:', err);
    process.exit(1);
});
