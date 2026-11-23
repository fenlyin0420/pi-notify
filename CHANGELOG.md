# Changelog

## [0.2.0]

### Added

- `title` channel: a 🔔 in front of the terminal tab title while pi waits, so a background tab says
  what happened without a sound. Cleared when the tab reports focus again, when any key is pressed,
  when the dialog closes, or when a session starts; it is part of the platform defaults.

## [0.1.0]

### Added

- Sound when a blocking dialog opens: `ask_user`, permission confirmations, project-trust prompts,
  and extension `select`/`confirm`/`input`/`editor`/`custom` screens (`ui_prompt_start`).
- Sound when a run settles and pi waits for input (`agent_settled`).
- Configurable channels: `bell`, `osc9`, `osc777`, and shell `command` with
  `NOTIFY_EVENT`/`NOTIFY_TITLE`/`NOTIFY_MESSAGE` in the environment.
- Per-event overrides so dialogs and finished runs can sound different.
- Bundled chime, played with `powershell` on Windows, `afplay` on macOS, BEL elsewhere.
- Config at `~/.pi/agent/extensions/fenlyin-pi-notify.json`, re-read on `/reload`.
