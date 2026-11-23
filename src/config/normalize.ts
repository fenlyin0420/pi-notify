/** Validation of the on-disk config file: the trust boundary between hand-edited JSON and the extension. */

import { CONFIG_SCHEMA_VERSION, DEFAULT_NOTIFY_CONFIG } from "./defaults.ts";
import type { ChannelSpec, EventConfig, NotifyConfig, NotifyEventName } from "./types.ts";

const EVENT_NAMES: readonly NotifyEventName[] = ["dialog", "idle"];

/**
 * Build a config from untrusted file content. Unknown fields, wrong types, and invalid channels are
 * dropped instead of failing the extension: a broken config must still leave pi usable.
 */
export function normalizeNotifyConfig(
	input: unknown,
	fallbackChannels: ChannelSpec[],
	base: NotifyConfig = DEFAULT_NOTIFY_CONFIG,
): NotifyConfig {
	if (!isRecord(input)) {
		return { ...base, channels: fallbackChannels, events: normalizeEvents(undefined, base.events) };
	}
	return {
		enabled: typeof input.enabled === "boolean" ? input.enabled : base.enabled,
		// An absent or unusable list means "use the platform default", not "be silent".
		channels: normalizeChannels(input.channels) ?? fallbackChannels,
		events: normalizeEvents(input.events, base.events),
	};
}

/** True when the file declares a schema version this build understands. */
export function isSupportedSchema(input: unknown): boolean {
	if (!isRecord(input)) return true;
	return input.schemaVersion === undefined || input.schemaVersion === CONFIG_SCHEMA_VERSION;
}

function normalizeEvents(value: unknown, base: Record<NotifyEventName, EventConfig>): Record<NotifyEventName, EventConfig> {
	const source = isRecord(value) ? value : {};
	const events = {} as Record<NotifyEventName, EventConfig>;
	for (const name of EVENT_NAMES) {
		const entry = source[name];
		const baseEvent = base[name];
		if (!isRecord(entry)) {
			events[name] = { enabled: baseEvent.enabled };
			continue;
		}
		const channels = normalizeChannels(entry.channels);
		events[name] = {
			enabled: typeof entry.enabled === "boolean" ? entry.enabled : baseEvent.enabled,
			...(channels ? { channels } : {}),
		};
	}
	return events;
}

function normalizeChannels(value: unknown): ChannelSpec[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const channels: ChannelSpec[] = [];
	for (const entry of value) {
		const channel = normalizeChannel(entry);
		if (channel) channels.push(channel);
	}
	return channels.length > 0 ? channels : undefined;
}

function normalizeChannel(value: unknown): ChannelSpec | undefined {
	if (value === "bell" || value === "osc9" || value === "osc777" || value === "title") return value;
	if (!isRecord(value)) return undefined;
	if (value.type !== "command") return undefined;
	const command = typeof value.command === "string" ? value.command.trim() : "";
	return command.length > 0 ? { type: "command", command } : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
