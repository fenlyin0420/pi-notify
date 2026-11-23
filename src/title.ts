/** Terminal tab marker: a 🔔 in front of pi's own tab title while pi waits for the user. */

import { basename } from "node:path";

/** Prefix the `title` channel writes. The space keeps the glyph off the app title. */
export const TAB_MARK = "🔔 ";

/**
 * The terminal's focus report (DECSET 1004), sent when the tab is entered again. pi turns reporting
 * on together with mouse tracking, so the sequence arrives without this extension asking for it.
 */
export const FOCUS_IN = "\u001b[I";

/** pi's app title, mirrored from `APP_TITLE` in pi, which is the literal π unless a fork renames it. */
const APP_TITLE = "π";

/** Where a tab title goes: `ctx.ui.setTitle` in the TUI, a no-op in every other mode. */
export type WriteTabTitle = (title: string) => void;

/** A tab title pi would show right now, plus the way to replace it. */
export interface TabTitle {
	base: string;
	write: WriteTabTitle;
}

/**
 * pi's own tab title, `<app> - <session> - <cwd>` with the session part only while the session is
 * named. A title has no read-back, so the marker needs the base text to remove itself again.
 */
export function baseTabTitle(cwd: string, sessionName: string | undefined): string {
	const name = sessionName?.trim();
	return name ? `${APP_TITLE} - ${name} - ${basename(cwd)}` : `${APP_TITLE} - ${basename(cwd)}`;
}

/** The `data`-listening half of stdin, narrow enough for tests to fake. */
export interface InputSource {
	on(event: "data", listener: (chunk: string | Buffer) => void): unknown;
	off(event: "data", listener: (chunk: string | Buffer) => void): unknown;
}

export interface TabTitleMarkerOptions {
	/**
	 * Where to watch for the terminal's focus report. pi's TUI consumes focus sequences before
	 * extension input listeners see them, so this goes straight to stdin: a second `data` listener
	 * receives the same chunks and touches nothing. Omitted outside the TUI and in tests.
	 */
	focusOn?: InputSource;
}

export interface TabTitleMarker {
	/** Prefix the title with the mark; repeated marks write the same text. */
	mark(tab: TabTitle): void;
	/** Put the remembered base title back, but only while this marker is the one showing. */
	clear(): void;
	/** Put a known base title back unconditionally: a fresh session may inherit a mark. */
	reset(tab: TabTitle): void;
}

export function createTabTitleMarker(options: TabTitleMarkerOptions = {}): TabTitleMarker {
	const { focusOn } = options;
	let marked = false;
	/** The title to restore, remembered from the last mark so clearing needs no context. */
	let base: string | undefined;
	let write: WriteTabTitle | undefined;
	let tail = "";
	let watching = false;

	function onData(chunk: string | Buffer): void {
		const text = tail + chunk.toString();
		// The focus report is three bytes; a chunk boundary can still split it.
		tail = text.slice(1 - FOCUS_IN.length);
		if (text.includes(FOCUS_IN)) marker.clear();
	}

	function watch(on: boolean): void {
		if (!focusOn || watching === on) return;
		watching = on;
		tail = "";
		if (on) focusOn.on("data", onData);
		else focusOn.off("data", onData);
	}

	const marker: TabTitleMarker = {
		mark(tab) {
			marked = true;
			base = tab.base;
			write = tab.write;
			put(write, TAB_MARK + tab.base);
			// Only a visible mark needs to know when the user comes back.
			watch(true);
		},
		clear() {
			if (!marked || base === undefined) return;
			const restore = base;
			marked = false;
			base = undefined;
			watch(false);
			put(write, restore);
			write = undefined;
		},
		reset(tab) {
			marked = false;
			base = undefined;
			watch(false);
			put(tab.write, tab.base);
		},
	};
	return marker;
}

/** A title write is a convenience: a terminal that rejects it must not break the notification. */
function put(write: WriteTabTitle | undefined, title: string): void {
	try {
		write?.(title);
	} catch {
		// Ignored on purpose, like every other channel.
	}
}
