/** Process-backed runtime: writes terminal sequences and starts sound commands without waiting. */

import { spawn } from "node:child_process";
import type { ChannelRuntime } from "./channels.ts";
import type { NotifyPayload } from "./config/types.ts";

export function createChannelRuntime(): ChannelRuntime {
	return {
		write(text) {
			process.stdout.write(text);
		},
		play(command, payload) {
			const child = spawn(command, {
				shell: true,
				// No new process group: on Windows that would raise a console window for every chime.
				// Ignored streams plus unref keep a slow player off pi's event loop instead.
				stdio: "ignore",
				windowsHide: true,
				env: { ...process.env, ...commandEnv(payload) },
			});
			child.on("error", () => {});
			child.unref();
		},
	};
}

/** `command` channels read the notification text from the environment, shell-safe by construction. */
function commandEnv(payload: NotifyPayload): Record<string, string> {
	return {
		NOTIFY_EVENT: payload.event,
		NOTIFY_TITLE: payload.title,
		NOTIFY_MESSAGE: payload.message,
	};
}
