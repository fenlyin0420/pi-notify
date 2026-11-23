# @fenlyin/pi-notify

Pi package that plays a configurable sound when pi waits for you: a dialog opens, or a run finishes
and the agent is waiting for your next prompt.

## Install

```bash
pi install npm:@fenlyin/pi-notify
```

Or try it for one session: `pi -e npm:@fenlyin/pi-notify`.

## What triggers a sound

| Event | pi event | When |
|---|---|---|
| `dialog` | `ui_prompt_start` | A blocking extension dialog opens: `ask_user`, permission confirmations, project-trust prompts, extension `select`/`confirm`/`input`/`editor`/`custom` screens |
| `idle` | `agent_settled` | A run has fully settled (no automatic retry, compaction, or queued continuation left) and pi is waiting for input |

Aborted runs (`Esc`) and every non-TUI mode are silent: outside the TUI stdout carries pi's JSON or
RPC stream, and an escape sequence there would corrupt it. pi's own slash-command pickers (`/model`,
`/sessions`, `/settings`) are not extension dialogs and emit no event, so they do not ring.

## Configure

Config path: `~/.pi/agent/extensions/fenlyin-pi-notify.json`. The file is optional; without it the
platform default plays the bundled chime. Edits take effect on `/reload` or the next session.

```json
{
	"schemaVersion": 1,
	"enabled": true,
	"channels": [
		{ "type": "command", "command": "powershell -NoProfile -c \"(New-Object Media.SoundPlayer 'C:\\snd\\ding.wav').PlaySync()\"" }
	],
	"events": {
		"dialog": { "enabled": true },
		"idle": { "enabled": true, "channels": ["bell"] }
	}
}
```

- `enabled` — master switch.
- `channels` — what every event plays unless it overrides them.
- `events.<name>.enabled` — per-event switch.
- `events.<name>.channels` — per-event override; `dialog` and `idle` can sound different.
- Invalid entries are dropped rather than failing pi; if no channel survives, the platform default is
  used.

### Channels

| Channel | Effect |
|---|---|
| `"bell"` | Writes BEL. The terminal or OS decides the sound. |
| `"osc9"` | OSC 9 notification: message only. |
| `"osc777"` | OSC 777 notification: title and message. |
| `{ "type": "command", "command": "..." }` | Runs the command detached, via the shell. |

Command channels get the notification text in the environment, so no quoting is needed:

```sh
NOTIFY_EVENT=ui.prompt.waiting    # or agent.settled
NOTIFY_TITLE="pi"
NOTIFY_MESSAGE="Waiting for input: Allow write?"
```

### Custom sounds

Windows — a WAV through the system player, or a plain tone without a file:

```json
{ "type": "command", "command": "powershell -NoProfile -c \"(New-Object Media.SoundPlayer 'D:\\snd\\ding.wav').PlaySync()\"" }
{ "type": "command", "command": "powershell -NoProfile -c \"[console]::beep(880,120)\"" }
{ "type": "command", "command": "powershell -NoProfile -c \"[System.Media.SystemSounds]::Asterisk.Play()\"" }
```

macOS and Linux:

```json
{ "type": "command", "command": "afplay /System/Library/Sounds/Glass.aiff" }
{ "type": "command", "command": "paplay /usr/share/sounds/freedesktop/stereo/bell.oga" }
```

The bundled chime is `assets/notify.wav` inside the installed package; the platform default command
plays it with `powershell` on Windows, `afplay` on macOS, and BEL everywhere else.

## Notes

- Sounds are best effort: a missing player, a closed stdout, or a broken config never interrupts pi.
- `command` channels are detached, so a slow player does not delay the dialog.
- If pi-ask (or another extension) rings on its own, turn its notification off to avoid a double
  sound; this package covers `ask_user` through `ui_prompt_start`.

## Development

```bash
npm install
npm test          # node --test over tests/*.test.ts
npm run typecheck
npm run generate-sound   # rebuild assets/notify.wav
```

## License

MIT
