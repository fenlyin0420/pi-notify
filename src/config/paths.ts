/** Where the extension keeps its config file and its bundled chime, resolved through pi's own helpers. */

import { fileURLToPath } from "node:url";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

export const CONFIG_FILE_NAME = "fenlyin-pi-notify.json";

/** The config lives next to the other pi extension config files under the agent directory. */
export function getNotifyConfigPath(): string {
	return join(getAgentDir(), "extensions", CONFIG_FILE_NAME);
}

/** The chime ships inside this package, so the default command works without user setup. */
export function getBundledSoundPath(): string {
	// paths.ts sits in src/config/, so the asset directory is two levels up in both the source tree and the published tarball.
	return fileURLToPath(new URL("../../assets/notify.wav", import.meta.url));
}
