/** Config vocabulary: what a notification is made of, which events fire it, and the file shape. */

/** One way to make a sound: a raw terminal sequence or a shell command. */
export type ChannelSpec = "bell" | "osc9" | "osc777" | { type: "command"; command: string };

/** Events that can raise a notification. */
export type NotifyEventName = "dialog" | "idle";

export interface EventConfig {
	enabled: boolean;
	/** Replaces the top-level channels for this event when present. */
	channels?: ChannelSpec[];
}

export interface NotifyConfig {
	enabled: boolean;
	/** Channels used by every event that does not override them. */
	channels: ChannelSpec[];
	events: Record<NotifyEventName, EventConfig>;
}

/** The text a channel delivers. */
export interface NotifyPayload {
	event: string;
	title: string;
	message: string;
}
