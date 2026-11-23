/** Config load: one disk read per session, plus an explicit reload when pi starts a new session. */

import { readFileSync } from "node:fs";
import { defaultChannels } from "./defaults.ts";
import { isSupportedSchema, normalizeNotifyConfig } from "./normalize.ts";
import { getBundledSoundPath, getNotifyConfigPath } from "./paths.ts";
import type { NotifyConfig } from "./types.ts";

export interface NotifyConfigStoreOptions {
	configPath?: string;
	platform?: NodeJS.Platform;
	soundPath?: string;
	/** Overridden in tests; returns undefined when the file is absent. */
	readFile?: (path: string) => string | undefined;
}

export interface NotifyConfigStore {
	readonly configPath: string;
	/** Cached config; the first call reads the file. Never throws. */
	get(): NotifyConfig;
	/** Drop the cache so the next `get()` re-reads the file. */
	reload(): void;
}

export function createNotifyConfigStore(options: NotifyConfigStoreOptions = {}): NotifyConfigStore {
	const configPath = options.configPath ?? getNotifyConfigPath();
	const fallbackChannels = defaultChannels(options.platform ?? process.platform, options.soundPath ?? getBundledSoundPath());
	const readFile = options.readFile ?? readFileIfPresent;
	let cached: NotifyConfig | undefined;
	return {
		configPath,
		get() {
			cached ??= load(configPath, fallbackChannels, readFile);
			return cached;
		},
		reload() {
			cached = undefined;
		},
	};
}

/**
 * A config that cannot be read or parsed falls back to defaults. Silently: pi's stdout is the TUI
 * and, in other modes, a protocol stream, so a warning here could corrupt a frame.
 */
function load(
	configPath: string,
	fallbackChannels: ReturnType<typeof defaultChannels>,
	readFile: (path: string) => string | undefined,
): NotifyConfig {
	const text = readFile(configPath);
	if (text === undefined) return normalizeNotifyConfig(undefined, fallbackChannels);
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return normalizeNotifyConfig(undefined, fallbackChannels);
	}
	if (!isSupportedSchema(parsed)) return normalizeNotifyConfig(undefined, fallbackChannels);
	return normalizeNotifyConfig(parsed, fallbackChannels);
}

function readFileIfPresent(path: string): string | undefined {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return undefined;
	}
}
