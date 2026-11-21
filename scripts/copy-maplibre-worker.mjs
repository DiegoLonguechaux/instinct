// MapLibre GL 6 charge son web worker depuis un fichier séparé que Next.js
// n'expose pas : on le copie dans public/map/ (voir RelayMap.tsx, setWorkerUrl).
// Lancé après chaque `npm install`, donc toujours aligné sur la version installée.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve('maplibre-gl/dist/maplibre-gl.css'));
const target = path.resolve('public', 'map');

mkdirSync(target, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, file), path.join(target, file));
}
