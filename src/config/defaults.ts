/** Default notification config: what plays when a user has to act, per platform. */

import type { ChannelSpec, EventConfig, NotifyConfig } from "./types.ts";

export const CONFIG_SCHEMA_VERSION = 1;

/** Quoting for `powershell -c` single-quoted strings: an embedded quote doubles. */
function powershellLiteral(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Platform default. Windows and macOS play the bundled chime through the system player because
 * BEL is often mapped to a generic ding; elsewhere BEL is the only channel that always exists.
 * `title` rides along everywhere: it is silent, needs no player, and marks the tab while pi waits.
 * A configured `channels` entry always replaces this.
 */
export function defaultChannels(platform: NodeJS.Platform, soundPath: string): ChannelSpec[] {
	if (platform === "win32") {
		return [
			{
				type: "command",
				command: `powershell -NoProfile -NonInteractive -c "(New-Object Media.SoundPlayer ${powershellLiteral(soundPath)}).PlaySync()"`,
			},
			"title",
		];
	}
	if (platform === "darwin") {
		return [{ type: "command", command: `afplay '${soundPath.replaceAll("'", "'\\''")}'` }, "title"];
	}
	return ["bell", "title"];
}

function defaultEvents(): Record<"dialog" | "idle", EventConfig> {
	return {
		dialog: { enabled: true },
		idle: { enabled: true },
	};
}

export const DEFAULT_NOTIFY_CONFIG: NotifyConfig = {
	enabled: true,
	channels: ["bell"],
	events: defaultEvents(),
};
