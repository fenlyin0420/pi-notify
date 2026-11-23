/**
 * Pi extension entry: a configurable sound when pi waits for the user.
 *
 * Two events cover the two waiting states: `ui_prompt_start` fires when a blocking extension dialog
 * opens (ask_user, permission confirmations, trust prompts) and `agent_settled` fires when a run has
 * fully settled and no automatic retry, compaction, or queued continuation will run.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createNotifyConfigStore } from "./config/store.ts";
import { notifyFromEvent } from "./notify.ts";
import { createChannelRuntime } from "./runtime.ts";

export default function notifyExtension(pi: ExtensionAPI): void {
	const store = createNotifyConfigStore();
	const runtime = createChannelRuntime();

	// A new session (including /reload) re-reads the config file.
	pi.on("session_start", () => {
		store.reload();
	});

	pi.on("ui_prompt_start", (event, ctx) => {
		if (ctx.mode !== "tui") return;
		notifyFromEvent({ kind: "dialog", promptKind: event.kind, title: event.title }, store, runtime);
	});

	pi.on("agent_settled", (event, ctx) => {
		// stdout carries the JSON and RPC streams outside the TUI, so only the TUI may emit here.
		if (ctx.mode !== "tui") return;
		// Escape means the user already knows the run stopped; silence is the expected answer.
		if (event.aborted) return;
		notifyFromEvent({ kind: "idle" }, store, runtime);
	});
}
