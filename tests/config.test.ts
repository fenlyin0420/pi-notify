/** Tests for the config trust boundary: defaults, dropped garbage, and per-event overrides. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_NOTIFY_CONFIG, defaultChannels } from "../src/config/defaults.ts";
import { isSupportedSchema, normalizeNotifyConfig } from "../src/config/normalize.ts";

const FALLBACK = [{ type: "command", command: "play default.wav" }] as const;

describe("defaultChannels", () => {
	it("plays the bundled chime through the platform player", () => {
		assert.deepEqual(defaultChannels("win32", "C:\\pi\\notify.wav"), [
			{
				type: "command",
				command:
					'powershell -NoProfile -NonInteractive -c "(New-Object Media.SoundPlayer \'C:\\pi\\notify.wav\').PlaySync()"',
			},
			"title",
		]);
		assert.deepEqual(defaultChannels("darwin", "/pi/notify.wav"), [
			{ type: "command", command: "afplay '/pi/notify.wav'" },
			"title",
		]);
	});

	it("falls back to BEL where no player is guaranteed", () => {
		assert.deepEqual(defaultChannels("linux", "/pi/notify.wav"), ["bell", "title"]);
		assert.deepEqual(defaultChannels("freebsd", "/pi/notify.wav"), ["bell", "title"]);
	});

	it("doubles single quotes so a path cannot end the PowerShell literal", () => {
		const [channel] = defaultChannels("win32", "C:\\it's\\notify.wav");
		assert.ok(channel && typeof channel !== "string");
		assert.match(channel.command, /'C:\\it''s\\notify\.wav'/u);
	});
});

describe("normalizeNotifyConfig", () => {
	it("returns defaults when the file is absent", () => {
		const config = normalizeNotifyConfig(undefined, [...FALLBACK]);
		assert.deepEqual(config, {
			enabled: true,
			channels: [...FALLBACK],
			events: { dialog: { enabled: true }, idle: { enabled: true } },
		});
	});

	it("keeps valid channels and drops invalid ones", () => {
		const config = normalizeNotifyConfig(
			{
				channels: [
					"bell",
					"osc9",
					"title",
					"loudspeaker",
					{ type: "command", command: "  " },
					{ type: "command", command: "aplay x.wav" },
				],
			},
			[...FALLBACK],
		);
		assert.deepEqual(config.channels, ["bell", "osc9", "title", { type: "command", command: "aplay x.wav" }]);
	});

	it("falls back to the platform default when every channel is invalid", () => {
		const config = normalizeNotifyConfig({ channels: ["nope", { type: "command" }] }, [...FALLBACK]);
		assert.deepEqual(config.channels, [...FALLBACK]);
	});

	it("honours the global switch and per-event switches", () => {
		const config = normalizeNotifyConfig({ enabled: false, events: { idle: { enabled: false } } }, [...FALLBACK]);
		assert.equal(config.enabled, false);
		assert.equal(config.events.idle.enabled, false);
		assert.equal(config.events.dialog.enabled, true);
	});

	it("applies per-event channels without touching the shared list", () => {
		const config = normalizeNotifyConfig(
			{ channels: ["bell"], events: { dialog: { channels: ["osc777"] } } },
			[...FALLBACK],
		);
		assert.deepEqual(config.channels, ["bell"]);
		assert.deepEqual(config.events.dialog, { enabled: true, channels: ["osc777"] });
		assert.deepEqual(config.events.idle, { enabled: true });
	});

	it("ignores non-object content", () => {
		const config = normalizeNotifyConfig("not json", [...FALLBACK]);
		assert.deepEqual(config.channels, [...FALLBACK]);
		assert.equal(config.enabled, DEFAULT_NOTIFY_CONFIG.enabled);
	});

	it("rejects unknown schema versions", () => {
		assert.equal(isSupportedSchema({ schemaVersion: 1 }), true);
		assert.equal(isSupportedSchema({ schemaVersion: 2 }), false);
		assert.equal(isSupportedSchema({}), true);
		assert.equal(isSupportedSchema(undefined), true);
	});
});
