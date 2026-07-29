# Start Launcher

A tiny macOS menu-bar app that turns [start-page](../) into an Alfred/Spotlight-style
quick launcher: a global hotkey pops up a small floating window with the start page in
it, you do your lookup, and **Escape** (or clicking away, or the hotkey again) dismisses
it. It stays resident in the menu bar, so it's instant every time.

It's a thin native shell — a `WKWebView` (WebKit) showing `https://corbin.uk/start` —
around the bits macOS needs: a global hotkey, a floating panel, and a menu-bar item.

## What it does

- **⌥Space** (Option-Space) summons / dismisses the window from anywhere.
- **Escape**, or clicking on another app, hides it (it stays running, so the next
  summon is instant). The hotkey toggles.
- **Menu-bar icon** (magnifying glass) — left-click toggles the window, right-click for
  a small menu (Reload / Quit).
- The window is **bigger than Spotlight, smaller than a Safari window**, with minimal
  chrome, and it **remembers its size and position**.
- The search box is focused automatically each time it opens, so you can just type.

## Build & run

Requires Xcode or the Command Line Tools (`xcode-select --install`).

```bash
cd mac-launcher
./build.sh
open StartLauncher.app
```

A magnifying-glass icon appears in the menu bar. Press **⌥Space** to try it.

> First launch: because the app is only ad-hoc signed (built locally, not notarised),
> Gatekeeper may hesitate. If so, right-click `StartLauncher.app` → **Open** once, then
> it's trusted. Global hotkeys need **no** special permission (it uses Carbon
> `RegisterEventHotKey`, not an event tap).

## Keep it around

- Move `StartLauncher.app` to `/Applications`.
- **Launch at login:** System Settings → General → **Login Items** → add it. Then it's
  always there in the menu bar.

## Your custom searches

The app has its **own** storage, separate from Safari (each WebKit app is sandboxed to
its own site data). So your custom searches (imdb, etc.) and favourites start empty here.
Two easy fixes:

- Set them up once inside the launcher, **or**
- In Safari, open Settings → Custom searches → **Share these…** to copy a link, then
  paste the code into the launcher via **Import…**. (That serverless share feature is
  already built into the page.)

## Tweaks

Everything configurable lives at the top of
[`Sources/StartLauncher/main.swift`](Sources/StartLauncher/main.swift):

- **Hotkey** — `kHotKeyCode` / `kHotKeyMods` (e.g. `controlKey`, or `cmdKey | optionKey`).
- **Default window size** — `kDefaultSize`.
- **URL** — `kStartURL` (point it at a different deployment if you like).

Rebuild with `./build.sh` after any change.

## Develop in Xcode

`open Package.swift` opens it as a Swift package you can edit and run with ⌘R. (Running
from Xcode produces a bare executable rather than a bundled `.app`; use `./build.sh` for
the real, keepable app.)

## Notes / ideas for later

- **AppKit, not SwiftUI** — for a faceless menu-bar app with a global hotkey and a
  floating `NSPanel`, AppKit is the pragmatic, compact choice; the actual view is still a
  WebKit component. A SwiftUI `MenuBarExtra` refactor is possible later.
- Could intercept a search's **result** navigation and hand it off to your main browser
  (via `WKNavigationDelegate`) while the panel just handles the query — currently
  everything stays in the panel, which suits inline lookups (dictionary, etc.).
- A hotkey **recorder** in the menu (instead of editing the source) would be a nice touch.

MIT, same as the rest of the project.
