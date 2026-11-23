# @fenlyin/pi-notify

Pi package that plays a configurable sound when pi waits for you: a dialog opens, or a run finishes
and the agent is waiting for your next prompt. It can also put a 🔔 in front of the terminal tab
title, so the tab you left alone says what happened.

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
		"title",
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
| `"title"` | Prefixes the terminal tab title with 🔔 while pi waits. Silent, and cleared as soon as you are back: the tab reports focus again, you type anything, the dialog closes, or a new session starts. |
| `{ "type": "command", "command": "..." }` | Runs the command detached, via the shell. |

`title` is in the platform defaults, so a stock install already marks its tab. Setting `channels`
yourself replaces the defaults, so list `"title"` there as well if you want to keep it.

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
- `title` replaces the whole tab title through OSC 0 with pi's own format (`π - session - directory`),
  which is why it is put back rather than appended to: a title cannot be read back.
- `title` knows you are back from the terminal's focus report (DECSET 1004), which pi enables together
  with mouse tracking. pi's TUI consumes those sequences before extensions see them, so this package
  watches stdin directly, read-only, and only while a mark is showing. A terminal without focus
  reports still clears on the first keypress.
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
