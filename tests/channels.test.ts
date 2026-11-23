/** Tests for the channel layer: terminal sequences, command payloads, and failure isolation. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChannelRuntime } from "../src/channels.ts";
import { playChannels } from "../src/channels.ts";
import type { NotifyPayload } from "../src/config/types.ts";

const PAYLOAD: NotifyPayload = {
	event: "ui.prompt.waiting",
	title: "pi",
	message: "Waiting for input: Allow write?",
};

function recordingRuntime(): ChannelRuntime & { writes: string[]; plays: Array<{ command: string; payload: NotifyPayload }> } {
	const writes: string[] = [];
	const plays: Array<{ command: string; payload: NotifyPayload }> = [];
	return {
		writes,
		plays,
		write(text) {
			writes.push(text);
		},
		play(command, payload) {
			plays.push({ command, payload });
		},
	};
}

describe("playChannels", () => {
	it("writes BEL for the bell channel", () => {
		const runtime = recordingRuntime();
		playChannels(["bell"], PAYLOAD, runtime);
		assert.deepEqual(runtime.writes, ["\u0007"]);
	});

	it("writes the message as an OSC 9 notification", () => {
		const runtime = recordingRuntime();
		playChannels(["osc9"], PAYLOAD, runtime);
		assert.deepEqual(runtime.writes, ["\u001b]9;Waiting for input: Allow write?\u0007"]);
	});

	it("writes title and message as an OSC 777 notification", () => {
		const runtime = recordingRuntime();
		playChannels(["osc777"], PAYLOAD, runtime);
		assert.deepEqual(runtime.writes, ["\u001b]777;notify;pi;Waiting for input: Allow write?\u0007"]);
	});

	it("runs command channels in order with the payload", () => {
		const runtime = recordingRuntime();
		playChannels(["bell", { type: "command", command: "play a.wav" }], PAYLOAD, runtime);
		assert.deepEqual(runtime.writes, ["\u0007"]);
		assert.deepEqual(runtime.plays, [{ command: "play a.wav", payload: PAYLOAD }]);
	});

	it("strips control characters and separators from OSC text", () => {
		const runtime = recordingRuntime();
		playChannels(["osc777"], { ...PAYLOAD, title: "a;b", message: "line\none\u0007two" }, runtime);
		assert.deepEqual(runtime.writes, ["\u001b]777;notify;a:b;line one two\u0007"]);
	});

	it("keeps going when one channel throws", () => {
		const writes: string[] = [];
		const runtime: ChannelRuntime = {
			write() {
				throw new Error("stdout closed");
			},
			play(command) {
				writes.push(command);
			},
		};
		playChannels(["bell", { type: "command", command: "play a.wav" }], PAYLOAD, runtime);
		assert.deepEqual(writes, ["play a.wav"]);
	});
});
