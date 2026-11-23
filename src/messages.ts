/** Notification text for each event, in the shape `command` channels receive as environment variables. */

import type { NotifyPayload } from "./config/types.ts";

export const NOTIFY_TITLE = "pi";

/** What pi is waiting for: a blocking dialog, or a finished run. */
export type NotifyReason = { kind: "dialog"; promptKind: string; title?: string } | { kind: "idle" };

export function payloadForReason(reason: NotifyReason): NotifyPayload {
	if (reason.kind === "idle") {
		return { event: "agent.settled", title: NOTIFY_TITLE, message: "Finished, waiting for your input" };
	}
	const subject = reason.title?.trim() || `${reason.promptKind} dialog`;
	return { event: "ui.prompt.waiting", title: NOTIFY_TITLE, message: `Waiting for input: ${subject}` };
}
