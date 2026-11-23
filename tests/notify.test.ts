/** Tests for the decision layer and for config loading from disk. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNotifyConfigStore } from "../src/config/store.ts";
import type { NotifyConfig } from "../src/config/types.ts";
import { payloadForReason } from "../src/messages.ts";
import { notifyForReason } from "../src/notify.ts";
import type { ChannelRuntime } from "../src/channels.ts";

const FALLBACK = [{ type: "command" as const, command: "play default.wav" }];

function config(overrides: Partial<NotifyConfig> = {}): NotifyConfig {
	return {
		enabled: true,
		channels: ["bell"],
		events: { dialog: { enabled: true }, idle: { enabled: true } },
		...overrides,
	};
}

function recordingRuntime(): ChannelRuntime & { writes: string[]; plays: string[] } {
	const writes: string[] = [];
	const plays: string[] = [];
	return {
		writes,
		plays,
		write(text) {
			writes.push(text);
		},
		play(command) {
			plays.push(command);
		},
	};
}

describe("payloadForReason", () => {
	it("names the dialog title when pi provides one", () => {
		assert.deepEqual(payloadForReason({ kind: "dialog", promptKind: "confirm", title: "Allow write?" }), {
			event: "ui.prompt.waiting",
			title: "pi",
			message: "Waiting for input: Allow write?",
		});
	});

	it("falls back to the dialog kind when there is no title", () => {
		assert.equal(payloadForReason({ kind: "dialog", promptKind: "custom" }).message, "Waiting for input: custom dialog");
	});

	it("reports a settled run", () => {
		assert.deepEqual(payloadForReason({ kind: "idle" }), {
			event: "agent.settled",
			title: "pi",
			message: "Finished, waiting for your input",
		});
	});
});

describe("notifyForReason", () => {
	it("plays the shared channels for a dialog", () => {
		const runtime = recordingRuntime();
		notifyForReason({ kind: "dialog", promptKind: "custom" }, config(), runtime);
		assert.deepEqual(runtime.writes, ["\u0007"]);
	});

	it("prefers the per-event channels", () => {
		const runtime = recordingRuntime();
		notifyForReason(
			{ kind: "idle" },
			config({ channels: ["bell"], events: { dialog: { enabled: true }, idle: { enabled: true, channels: ["osc9"] } } }),
			runtime,
		);
		assert.deepEqual(runtime.writes, ["\u001b]9;Finished, waiting for your input\u0007"]);
	});

	it("stays silent when the config, the event, or the channel list says so", () => {
		for (const candidate of [
			config({ enabled: false }),
			config({ events: { dialog: { enabled: false }, idle: { enabled: true } } }),
			config({ channels: [] }),
		]) {
			const runtime = recordingRuntime();
			notifyForReason({ kind: "dialog", promptKind: "confirm" }, candidate, runtime);
			assert.deepEqual(runtime.writes, []);
			assert.deepEqual(runtime.plays, []);
		}
	});
});

describe("createNotifyConfigStore", () => {
	it("uses the platform default when the file is missing", () => {
		const store = createNotifyConfigStore({
			configPath: "/nowhere/config.json",
			platform: "linux",
			soundPath: "/pkg/notify.wav",
			readFile: () => undefined,
		});
		assert.deepEqual(store.get().channels, ["bell"]);
	});

	it("reads JSON, normalizes it, and caches until reload", () => {
		let reads = 0;
		const store = createNotifyConfigStore({
			configPath: "/tmp/config.json",
			platform: "win32",
			soundPath: "C:\\pkg\\notify.wav",
			readFile: () => {
				reads += 1;
				return JSON.stringify({ channels: ["osc9"], events: { idle: { enabled: false } } });
			},
		});
		assert.deepEqual(store.get().channels, ["osc9"]);
		assert.equal(store.get().events.idle.enabled, false);
		assert.equal(reads, 1);
		store.reload();
		store.get();
		assert.equal(reads, 2);
	});

	it("falls back to defaults on broken JSON or an unknown schema version", () => {
		for (const content of ["{", JSON.stringify({ schemaVersion: 99 })]) {
			const store = createNotifyConfigStore({
				configPath: "/tmp/config.json",
				platform: "darwin",
				soundPath: "/pkg/notify.wav",
				readFile: () => content,
			});
			assert.deepEqual(store.get().channels, [{ type: "command", command: "afplay '/pkg/notify.wav'" }]);
		}
	});
});
