import {InputError} from '../input/errors.js';
import type {VirtualFS} from '../vfs.js';

export interface ScannedProject {
  readonly html: string;
  readonly stylesheets: readonly string[];
  readonly engineScripts: readonly string[];
  readonly gameScripts: readonly string[];
  readonly configs: {
    readonly settings: string | undefined;
    readonly importMap: string | undefined;
  };
  readonly assets: readonly string[];
}

export function scanProject(_vfs: VirtualFS): ScannedProject {
  const htmlPath = 'index.html';
  if (!_vfs.has(htmlPath)) {
    throw new InputError('NO_INDEX_HTML', 'Không tìm thấy file index.html');
  }

  const stylesheets: string[] = [];
  const engineScripts: string[] = [];
  const gameScripts: string[] = [];
  const assets: string[] = [];
  let settings: string | undefined;
  let importMap: string | undefined;

  for (const p of _vfs.list()) {
    if (p === htmlPath) {
      continue; // Đã xử lý HTML
    } else if (p.endsWith('.css')) {
      stylesheets.push(p);
    } else if (/^src\/settings(\.[0-9a-f]+)?\.json$/.test(p)) {
      settings = p;
    } else if (/^src\/import-map(\.[0-9a-f]+)?\.json$/.test(p)) {
      importMap = p;
    } else if (p.includes('polyfills.bundle') || p.includes('system.bundle')) {
      engineScripts.push(p);
    } else if (
      (p.startsWith('index') && p.endsWith('.js')) ||
      (p.startsWith('application') && p.endsWith('.js')) ||
      p.startsWith('cocos-js/') ||
      p.startsWith('src/chunks/')
    ) {
      gameScripts.push(p);
    } else {
      assets.push(p);
    }
  }

  if (!settings) {
    throw new InputError('NOT_FOUND', 'Không tìm thấy file settings.json');
  }

  return {
    html: htmlPath,
    stylesheets: stylesheets,
    engineScripts: engineScripts,
    gameScripts: gameScripts,
    configs: {
      settings: settings,
      importMap: importMap
    },
    assets: assets,
  };
}
