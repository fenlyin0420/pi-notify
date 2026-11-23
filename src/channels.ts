/** Sound channels: the terminal escape sequences and shell commands a notification can use. */

import type { ChannelSpec, NotifyPayload } from "./config/types.ts";

/** The two side effects a channel needs, injected so tests never touch a terminal or a process. */
export interface ChannelRuntime {
	write(text: string): void;
	play(command: string, payload: NotifyPayload): void;
}

/** Run every configured channel in order. A failing channel is dropped: it is best effort. */
export function playChannels(channels: ChannelSpec[], payload: NotifyPayload, runtime: ChannelRuntime): void {
	for (const channel of channels) {
		try {
			if (channel === "bell") {
				runtime.write("\x07");
			} else if (channel === "osc9") {
				runtime.write(`\x1b]9;${printable(payload.message)}\x07`);
			} else if (channel === "osc777") {
				runtime.write(`\x1b]777;notify;${oscField(payload.title)};${oscField(payload.message)}\x07`);
			} else {
				runtime.play(channel.command, payload);
			}
		} catch {
			// A closed stdout or a missing player must not interrupt pi.
		}
	}
}

/** OSC payload text: one line, no control characters, so a terminal cannot misparse the sequence. */
function printable(value: string): string {
	// Control characters become spaces so that a stray BEL or newline separates words instead of joining them.
	const withoutControls = [...value]
		.map((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code > 31 && code !== 127 ? character : " ";
		})
		.join("");
	return withoutControls.replaceAll(/\s+/gu, " ").trim();
}

/** OSC fields are `;`-separated, so a separator inside a field would split it into extra arguments. */
function oscField(value: string): string {
	return printable(value).replaceAll(";", ":");
}
