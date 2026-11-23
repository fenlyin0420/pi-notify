/** Decision layer: whether an event should make a sound, and through which channels. */

import type { ChannelRuntime } from "./channels.ts";
import { playChannels } from "./channels.ts";
import type { NotifyConfig } from "./config/types.ts";
import { payloadForReason, type NotifyReason } from "./messages.ts";
import type { NotifyConfigStore } from "./config/store.ts";

/** Play the sound for `reason` unless the config silences it, this event, or every channel. */
export function notifyForReason(reason: NotifyReason, config: NotifyConfig, runtime: ChannelRuntime): void {
	if (!config.enabled) return;
	const event = config.events[reason.kind];
	if (!event.enabled) return;
	const channels = event.channels ?? config.channels;
	if (channels.length === 0) return;
	playChannels(channels, payloadForReason(reason), runtime);
}

/**
 * Handle one event end to end. pi invokes extension handlers without awaiting them, so a config
 * read or a player process here cannot delay the dialog itself.
 */
export function notifyFromEvent(
	reason: NotifyReason,
	store: NotifyConfigStore,
	runtime: ChannelRuntime,
): void {
	notifyForReason(reason, store.get(), runtime);
}
