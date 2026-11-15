// Hivelight's hand-in program for the make.fun best-game-01 bounty.
//
// The grader runs this file twice in a sandbox with the repository mounted
// read-only and a writable output directory. Each run copies the playable
// game and its screenshots across, then writes the dossier the judge reads,
// built with the kit's own library (vendor/makefun-game.ts) at the gate's
// caps, so the bytes here are the bytes the grader rebuilds for itself.
// Nothing below depends on the clock, the network or the machine, so the
// two runs write identical output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own limits, restated so the dossier is built under the same
// caps the scorer will hold it to: 160 KiB of source text, at most four
// screenshots of 256 KiB, a game tree of at most 993 entries and 48 MiB,
// and no path longer than 1,000 bytes.
const GATE_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1_000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossierBytes = buildDossier(outputDir, GATE_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
