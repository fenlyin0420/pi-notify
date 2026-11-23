/**
 * Pi extension entry: a configurable sound when pi waits for the user, plus a tab-title mark.
 *
 * Two events cover the two waiting states: `ui_prompt_start` fires when a blocking extension dialog
 * opens (ask_user, permission confirmations, trust prompts) and `agent_settled` fires when a run has
 * fully settled and no automatic retry, compaction, or queued continuation will run. Both clear
 * again — the dialog's `ui_prompt_end`, the next prompt the user types — so the tab only carries the
 * mark while it still means something.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ChannelRuntime } from "./channels.ts";
import { createNotifyConfigStore } from "./config/store.ts";
import { notifyFromEvent } from "./notify.ts";
import { createChannelRuntime } from "./runtime.ts";
import { baseTabTitle, createTabTitleMarker } from "./title.ts";

export default function notifyExtension(pi: ExtensionAPI): void {
	const store = createNotifyConfigStore();
	// Focus reports go through stdin: pi's TUI consumes them before extension input listeners see them.
	const titleMarker = createTabTitleMarker({ focusOn: process.stdin });
	let stopInputWatch: (() => void) | undefined;

	/** pi's current tab title, with the way to replace it, resolved from the event's own context. */
	function tabTitle(ctx: ExtensionContext) {
		return {
			base: baseTabTitle(ctx.sessionManager.getCwd(), ctx.sessionManager.getSessionName()),
			write: (title: string) => ctx.ui.setTitle(title),
		};
	}

	/** A runtime bound to this event, so the `title` channel marks the tab the notification came from. */
	function runtimeFor(ctx: ExtensionContext): ChannelRuntime {
		const tab = tabTitle(ctx);
		return createChannelRuntime({ markTitle: () => titleMarker.mark(tab) });
	}

	// A new session (including /reload) re-reads the config file. A fresh extension instance cannot
	// know whether an older one left its mark behind, so the title is reset unconditionally.
	pi.on("session_start", (_event, ctx) => {
		store.reload();
		titleMarker.reset(tabTitle(ctx));
		// Terminals without focus reports still tell us the user is back: they type something.
		stopInputWatch?.();
		stopInputWatch = ctx.ui.onTerminalInput(() => {
			titleMarker.clear();
		});
	});

	pi.on("ui_prompt_start", (event, ctx) => {
		if (ctx.mode !== "tui") return;
		notifyFromEvent({ kind: "dialog", promptKind: event.kind, title: event.title }, store, runtimeFor(ctx));
	});

	// The dialog was answered or cancelled: the user has seen it, so the mark has done its job.
	pi.on("ui_prompt_end", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		titleMarker.clear();
	});

	pi.on("agent_settled", (event, ctx) => {
		// stdout carries the JSON and RPC streams outside the TUI, so only the TUI may emit here.
		if (ctx.mode !== "tui") return;
		// Escape means the user already knows the run stopped; silence is the expected answer.
		if (event.aborted) return;
		notifyFromEvent({ kind: "idle" }, store, runtimeFor(ctx));
	});

	// Typing anything means the user is back at this tab, which is what the mark was asking for.
	pi.on("input", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		titleMarker.clear();
	});

	// Nothing should keep a bell glyph in a tab after pi is gone.
	pi.on("session_shutdown", (_event, _ctx) => {
		titleMarker.clear();
		stopInputWatch?.();
		stopInputWatch = undefined;
	});
}
