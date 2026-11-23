/**
 * Regenerates assets/notify.wav: a short two-tone chime (A5 then E6) as 44.1 kHz mono 16-bit PCM.
 *
 * Run with `npm run generate-sound`. The file is committed so installing the package needs no build.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 44_100;
const TOTAL_SECONDS = 0.42;
const PEAK = 0.45;

const notes = [
	{ frequency: 880, start: 0, seconds: 0.1 },
	{ frequency: 1318.51, start: 0.09, seconds: 0.3 },
];

const frames = Math.round(RATE * TOTAL_SECONDS);
const samples = new Float64Array(frames);

for (const note of notes) {
	const first = Math.round(RATE * note.start);
	const length = Math.round(RATE * note.seconds);
	for (let index = 0; index < length; index += 1) {
		const frame = first + index;
		if (frame >= frames) break;
		const time = index / RATE;
		const phase = 2 * Math.PI * note.frequency * time;
		// Short attack, exponential decay: a chime instead of a click.
		const attack = Math.min(1, index / (RATE * 0.004));
		const decay = Math.exp((-5 * index) / length);
		samples[frame] += Math.sin(phase) * attack * decay * 0.6;
	}
}

const data = Buffer.alloc(frames * 2);
for (let index = 0; index < frames; index += 1) {
	const value = Math.max(-1, Math.min(1, samples[index] * PEAK));
	data.writeInt16LE(Math.round(value * 32_767), index * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0, "ascii");
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8, "ascii");
header.write("fmt ", 12, "ascii");
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write("data", 36, "ascii");
header.writeUInt32LE(data.length, 40);

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetDirectory = join(packageRoot, "assets");
mkdirSync(assetDirectory, { recursive: true });
const target = join(assetDirectory, "notify.wav");
writeFileSync(target, Buffer.concat([header, data]));
console.log(`Wrote ${target} (${(header.length + data.length) / 1024} KB, ${TOTAL_SECONDS}s)`);
