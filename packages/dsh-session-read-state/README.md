# dsh-session-read-state

Right-click a Session in the sidebar to mark it read or unread, and an unread
Session keeps a **新 / New** pill beside its title.

## Where to find it

Right-click any Session in the sidebar list, or use the row's own **…** button.
The Session menu gains one row — **标为已读会话** / **Mark session read** or
**标为未读会话** / **Mark session unread**, depending on the Session's current
state — between Fork and Copy Session ID; Archive stays at the foot of the menu.
Each mark answers with a short notice carrying **撤销 / Undo**.

The row's **…** button opens the same menu, so the action is reachable on touch
screens as well.

The row carries the eye glyph from the same icon set as Rename, Pin, Archive,
Fork, and Copy: a crossed-out eye for **标为已读会话**, an open eye for
**标为未读会话**.

## What the marks mean

| Mark | When it is made | What clears it |
|---|---|---|
| Unread | **标为未读会话**, whether or not a turn finished | **标为已读会话**, or opening the Session |
| Read | **标为已读会话**, also over a finished-but-unviewed Session | Opening the Session, or a later turn that finishes |

**Read** hides the row's finished-but-unread signal — DeepSeek Harness shows a
「已完成 / done」 dot for a turn that ended while you were elsewhere — until you
open that Session once. The mark then disappears, so a later finished turn
marks the row unread again. A row that is waiting for an approval or an answer,
or has a subagent still running, keeps that live dot whatever the mark says.
**Unread** adds the pill even when no turn finished.

Opening a Session always wins, which is the same gesture Harness already uses
to acknowledge a finished-but-unviewed turn.

## Limits

- Marks live in this browser's `localStorage`, keyed by Session id. They do not
  sync to other browsers or machines, and clearing site data clears them.
  Nothing is written to the Session log, so the model never sees a mark.
- Other tabs of the same browser pick up changes through the `storage` event;
  in private mode or with storage blocked, a mark holds only until reload.
- A read mark covers the Session until its next finished turn, so a
  long-running background Session you marked read turns unread again when that
  turn ends.
- The decorations are drawn onto the page. A Session the list hides (collapsed
  group, archived filter) shows its pill and its normal status when it is back
  on screen.
- Disabling the bundle removes the menu row, the notices, and every decoration;
  the stored marks stay in the browser until their state clears or the bundle
  is enabled again.

## Icon

The plugin icon is the `eye-off` glyph from [Lucide](https://lucide.dev/icons/eye-off)
(ISC License, © Lucide Icons and contributors), recolored to the sidebar glyph
slate (`#5b6b7c`) and scaled from Lucide's 24-unit grid to the 36px plugin tile.
It is the same "crossed-out eye" the menu row uses for **标为已读会话**, so the
Plugin Manager entry and the row read as one feature. The SVG is self-contained
geometry only — no script, style, text, or external reference.

## Version

`0.1.0`. The number in the Plugin Manager is read from this package's own
`package.json` `version`; a local directory plugin is linked, so the profile
never resolves it through the registry and never compares it with a published
release. Nothing bumps it automatically. While the plugin stays unpublished,
`0.1.0` is the working identity: keep it there, and raise it to `0.2.0` (or the
next number) when the plugin is first published or handed to someone else.
The Plugin Manager may list an installed row's version from its last snapshot
until the page re-reads the bundles, so a stale number there is not evidence of
a stale bundle.
