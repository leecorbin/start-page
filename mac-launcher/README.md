# Start Launcher

A tiny macOS menu-bar app that turns [start-page](../) into an Alfred/Spotlight-style
quick launcher: a global hotkey pops up a small floating window with the start page in
it, you do your lookup, and **Escape** steps you back out. It stays resident in the menu
bar, so it's instant every time.

It's a thin native shell — a `WKWebView` (WebKit) showing your start page — around the
bits macOS needs: a global hotkey, a floating panel, a menu-bar item, and a small
settings window.

## What it does

- **⌥Space** (default) summons / dismisses the window from anywhere. The hotkey is
  configurable in Settings.
- **Escape works like it does on the page — a step back:** from a search result it goes
  back to the start page **with your query still in the box** (the app stashes it and
  re-injects it); on the start page it drops the autocomplete / exits a plugin / clears
  the box / drops the bang chip; and once there's nothing left, it closes the window.
  Clicking on another app also hides it.
- **A fresh summon starts clean** — reopening the popup resets to an empty start page, so
  every lookup begins fresh (Esc-back within a session is what keeps your query).
- **Browse toolbar** — when a result opens *in the panel*, a slim back / forward / reload
  strip appears at the top; on the start page there's no toolbar (minimal chrome).
- **Menu-bar icon** (magnifying glass) — left-click toggles the window, right-click for a
  menu (Settings / Reload / Quit).
- The window is **bigger than Spotlight, smaller than a Safari window**, minimal chrome
  (close button only — no minimise or zoom), and it **remembers its size and position**.
  The search box is focused on every open.

## Build & run

Requires Xcode or the Command Line Tools (`xcode-select --install`), macOS 14+.

```bash
cd mac-launcher
./build.sh
open StartLauncher.app
```

A magnifying-glass icon appears in the menu bar. Press **⌥Space** to try it.

> First launch: the app is only ad-hoc signed (built locally, not notarised), so
> Gatekeeper may hesitate — right-click `StartLauncher.app` → **Open** once, then it's
> trusted. Global hotkeys need **no** special permission (Carbon `RegisterEventHotKey`).

## Settings

Right-click the menu-bar icon → **Settings…** (or ⌘, from that menu):

- **Start page URL** — defaults to `corbin.uk/start`; point it anywhere. It's always
  loaded with `?launcher=1` appended (merged with any existing query) so the page can
  tailor itself to the launcher.
- **Open search results** — *in the panel* (default) or *in your browser*. Inline lookups
  (dictionary, colour, …) don't navigate, so they stay in the panel regardless. When you
  choose the browser, you can also **dismiss the launcher** on open (default on).
- **Global shortcut** — click to record a new combo (needs a modifier; esc cancels).
- **Launch at login** — toggles a proper login item via `SMAppService` (no scripting).
  Works best with the app in `/Applications`.

Settings persist in `UserDefaults`.

## Your custom searches

The app has its **own** storage, separate from Safari (each WebKit app is sandboxed to
its own site data), so your custom searches (imdb, etc.) and favourites start empty here.
Set them up once inside the launcher, **or** in Safari open Settings → Custom searches →
**Share these…** to copy a link and paste the code into the launcher via **Import…**
(that serverless share feature is already built into the page).

## How the launcher ↔ page bridge works

The app appends `?launcher=1`; the page sets an `IS_LAUNCHER` flag from it. That gives a
two-way channel: the page can call `window.webkit.messageHandlers.launcher.postMessage(…)`
(used for "close"), and the app reads the page's history to decide Esc behaviour. It's a
clean seam for future launcher-only tweaks — e.g. a per-custom-search hint so *simple*
lookups stay in the panel while *heavier* ones open in your browser.

## Develop in Xcode

`open Package.swift` opens it as a Swift package to edit and run with ⌘R. (Running from
Xcode produces a bare executable; use `./build.sh` for the real, keepable `.app`.)

## Notes

- **AppKit + a SwiftUI settings window** — for a faceless menu-bar app with a global
  hotkey and a floating `NSPanel`, AppKit is the pragmatic core; the settings form is
  SwiftUI (`@AppStorage`), and the view is a WebKit component.
- Source layout: [`main.swift`](Sources/StartLauncher/main.swift) (app + panel + Esc +
  navigation policy + bridge), [`HotKeyManager.swift`](Sources/StartLauncher/HotKeyManager.swift)
  (Carbon hotkey), [`SettingsView.swift`](Sources/StartLauncher/SettingsView.swift)
  (settings + shortcut recorder).

MIT, same as the rest of the project.
