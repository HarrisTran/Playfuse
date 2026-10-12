#!/usr/bin/env node
import { getVersion } from './version.js';
import { packProject } from '../core/index.js';
import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

async function main() {
    const args = process.argv.slice(2);

    const printHelp = () => {
        console.log(`
${getVersion()}
Usage: playfuse <input-path> <output-path> [options]

Arguments:
  <input-path>          Path to Cocos Creator build folder or .zip file
  <output-path>         Path to output .html file or output directory

Options:
  -v, --version         Show version number
  -h, --help            Show help
  --network <ids>       Ads network(s): generic | applovin | google | mintegral | all (default: generic, e.g. --network google,mintegral)
  --debug               Build in debug mode (unminified runtime and exposed window variables)
`);
    };

    if (args.includes('-v') || args.includes('--version')) {
        console.log(getVersion());
        return;
    }

    if (args.includes('-h') || args.includes('--help') || args.length === 0) {
        printHelp();
        return;
    }

    const positionalArgs: string[] = [];
    let network = 'generic';
    let debug = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--debug') {
            debug = true;
        } else if (arg === '--network') {
            if (i + 1 < args.length && !args[i + 1]!.startsWith('-')) {
                network = args[i + 1]!;
                i++;
            }
        } else if (arg.startsWith('--network=')) {
            network = arg.slice('--network='.length);
        } else if (!arg.startsWith('-')) {
            positionalArgs.push(arg);
        }
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1];

    if (!inputPath || !outputPath) {
        printHelp();
        throw new Error('Both <input-path> and <output-path> are required.');
    }

    // Resolve runtime index.ts
    let runtimeEntry = fileURLToPath(new URL('../runtime/index.ts', import.meta.url));
    if (!fs.existsSync(runtimeEntry)) {
        runtimeEntry = fileURLToPath(new URL('../../src/runtime/index.ts', import.meta.url));
    }

    console.log(`[Playfuse] Bundling runtime hooks...${debug ? ' (debug mode)' : ' (minified)'}`);
    const buildResult = await esbuild.build({
        entryPoints: [runtimeEntry],
        bundle: true,
        write: false,
        target: 'es2015',
        format: 'iife',
        globalName: '__pf',
        minify: !debug,
    });
    const runtimeCode = buildResult.outputFiles[0]!.text;

    console.log(`[Playfuse] Packing project from: ${inputPath}`);
    const outputFiles = await packProject(inputPath, outputPath, runtimeCode, network, { debug });
    console.log(`[Playfuse] Successfully generated ${outputFiles.length} playable ad file(s):`);
    for (const file of outputFiles) {
        const stats = fs.statSync(file);
        const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`           -> ${file} (${sizeInMb} MB / ${stats.size} bytes)`);
    }
}

main().catch((err) => {
    console.error('[Playfuse Error]:', err);
    process.exit(1);
});
