/** Tests for the tab-title marker: pi's title format, the mark/clear cycle, and the focus report. */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { baseTabTitle, createTabTitleMarker, FOCUS_IN, TAB_MARK, type InputSource } from "../src/title.ts";

/** Stands in for stdin: the marker only listens, tests only push. */
function fakeFocus(): InputSource & { push(chunk: string | Buffer): void; listeners(): number } {
	const emitter = new EventEmitter();
	return {
		on: (event, listener) => emitter.on(event, listener),
		off: (event, listener) => emitter.off(event, listener),
		push: (chunk) => emitter.emit("data", chunk),
		listeners: () => emitter.listenerCount("data"),
	};
}

describe("baseTabTitle", () => {
	it("mirrors pi's title with and without a session name", () => {
		assert.equal(baseTabTitle("D:\\Projects\\pi-notify", undefined), "π - pi-notify");
		assert.equal(baseTabTitle("/home/me/proj", "fix tabs"), "π - fix tabs - proj");
	});

	it("ignores a blank session name", () => {
		assert.equal(baseTabTitle("/home/me/proj", "   "), "π - proj");
	});
});

describe("createTabTitleMarker", () => {
	function harness(base = "π - proj") {
		const written: string[] = [];
		return { written, tab: { base, write: (title: string) => written.push(title) } };
	}

	it("prefixes the mark and puts the base title back", () => {
		const { written, tab } = harness();
		const marker = createTabTitleMarker();
		marker.mark(tab);
		marker.clear();
		assert.deepEqual(written, [TAB_MARK + "π - proj", "π - proj"]);
	});

	it("writes nothing on clear when there is no mark of its own", () => {
		const { written } = harness();
		createTabTitleMarker().clear();
		assert.deepEqual(written, []);
	});

	it("is idempotent: a second mark or clear does not stack", () => {
		const { written, tab } = harness();
		const marker = createTabTitleMarker();
		marker.mark(tab);
		marker.mark(tab);
		marker.clear();
		marker.clear();
		assert.deepEqual(written, [TAB_MARK + "π - proj", TAB_MARK + "π - proj", "π - proj"]);
	});

	it("resets a title inherited from an older extension load", () => {
		const { written, tab } = harness();
		createTabTitleMarker().reset(tab);
		assert.deepEqual(written, ["π - proj"]);
	});

	it("remembers the base title, so the event that clears needs no session context", () => {
		const { written, tab } = harness();
		const marker = createTabTitleMarker();
		marker.mark(tab);
		tab.base = "π - renamed - proj";
		marker.clear();
		assert.deepEqual(written, [TAB_MARK + "π - proj", "π - proj"]);
	});

	it("survives a terminal that refuses the title", () => {
		const marker = createTabTitleMarker();
		marker.mark({
			base: "π - proj",
			write() {
				throw new Error("stdout closed");
			},
		});
		marker.clear();
	});
});

describe("focus report", () => {
	function harness() {
		const focus = fakeFocus();
		const written: string[] = [];
		const marker = createTabTitleMarker({ focusOn: focus });
		const tab = { base: "π - proj", write: (title: string) => written.push(title) };
		return { focus, written, marker, tab };
	}

	it("clears the mark when the terminal reports the tab is back", () => {
		const { focus, written, marker, tab } = harness();
		marker.mark(tab);
		focus.push(FOCUS_IN);
		assert.deepEqual(written, [TAB_MARK + "π - proj", "π - proj"]);
	});

	it("listens only while a mark is showing", () => {
		const { focus, marker, tab } = harness();
		assert.equal(focus.listeners(), 0);
		marker.mark(tab);
		assert.equal(focus.listeners(), 1);
		focus.push(FOCUS_IN);
		assert.equal(focus.listeners(), 0);
	});

	it("recognises a focus report split across two chunks", () => {
		const { focus, written, marker, tab } = harness();
		marker.mark(tab);
		focus.push("\u001b");
		focus.push("[I");
		assert.deepEqual(written, [TAB_MARK + "π - proj", "π - proj"]);
	});

	it("recognises a focus report inside a larger chunk", () => {
		const { focus, written, marker, tab } = harness();
		marker.mark(tab);
		focus.push(`\u001b[<0;10;5M${FOCUS_IN}abc`);
		assert.deepEqual(written, [TAB_MARK + "π - proj", "π - proj"]);
	});

	it("accepts Buffer chunks and ignores ordinary typing", () => {
		const { focus, written, marker, tab } = harness();
		marker.mark(tab);
		focus.push(Buffer.from("abc", "utf8"));
		assert.deepEqual(written, [TAB_MARK + "π - proj"]);
		focus.push(Buffer.from(FOCUS_IN, "utf8"));
		assert.deepEqual(written, [TAB_MARK + "π - proj", "π - proj"]);
	});
});
