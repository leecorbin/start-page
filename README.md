# start-page

A minimal, **instant** browser start page — a single `index.html` with no build
step, no tracking, and no API keys. Host it anywhere or just open it locally.
Inspired by [Bonjourr](https://bonjourr.fr), trimmed down and made hackable.

![start-page running as a Safari new-tab page](screenshot.png)

## Features

- ⚡️ **Instant load** — one self-contained file. A gradient paints immediately;
  the chosen photo fades in (or pops in instantly when prefetched/cached).
- 🔎 **Search / address box** — one field that works out what you typed:
  - `↵` → **smart**: opens it as a site if it looks like a URL (`github.com`),
    otherwise **searches** (Ecosia by default). Detection only fires on real common
    TLDs, so dotted search terms like `node.js` aren't hijacked.
  - `/` prefix or `⇧↵` → force **go to site** (bare words get `.com`, e.g. `/github`)
  - `⌥↵` → force **search**
  - `⌘↵` → **Ask Claude** (opens the Claude desktop app with your text prefilled)
  - `⌘L` still focuses Safari's real address bar (full history/autocomplete).
  - Smart detection is toggleable in settings.
  - **Custom keyword searches** — type `imdb avatar` and the box flips to an
    IMDb-search chip (showing the site's icon); `↵` goes straight to results.
    Presets included (IMDb, Rotten Tomatoes, YouTube, Wikipedia, GitHub, Amazon,
    Maps) and fully editable.
  - **Pick your engine** — Ecosia (default), DuckDuckGo, Google, Brave, Startpage,
    Qwant, Bing.
  - **Web suggestions** (off by default) — opt-in Google autocomplete with arrow-key
    selection; clearly labelled "sends typing to Google", since no privacy engine
    exposes suggestions to a static page.
- 🖼️ **Background of the day** from keyless providers, with photographer credit:
  - **Photos (Picsum)** — [Lorem Picsum](https://picsum.photos), no API key, images from Unsplash
  - **Favourites** — ⭐ any photo (stored by id, no files needed) and cycle through them
  - **Local folder** — drop your own wallpapers in `backgrounds/`
  - **Solid colour**
  - ⬇ **Download** the current photo to keep it locally.
- 🌤️ **Local weather** — keyless via [Open-Meteo](https://open-meteo.com); set a city
  or use your location. Understated icon + temperature.
- 🔗 **Quick links & custom searches** share the same icons: clean brand glyphs
  via [Iconify Simple Icons](https://simpleicons.org), falling back to the
  DuckDuckGo favicon then a letter monogram, with an optional per-item
  **emoji/symbol override** (⌃⌘Space). Quick links also have styled **hover
  tooltips**, **reorderable** rows, and a **Small / Medium / Large** icon-size
  option (handy for wide wordmark logos).
- 💾 **Export / import settings** — back up your whole config (and favourites) to a
  JSON file and restore it on another machine.
- 🌗 **Dynamic contrast** — samples the background's brightness and flips text/icons
  to stay legible on light *or* dark photos.
- 🕰️ **Digital or analogue clock** (analogue has a second hand) + time-of-day
  greeting (12/24h, optional seconds).
- ⚡️ **Instant images** — the *next* photo is prefetched during idle, so opening a
  new tab paints a fresh photo with no wait (after the first load).
- ❓ **Help popup** (`⌘/`) — a low-key summary of what's here and the full keyboard
  shortcut list, including your custom searches.
- ⚙️ **Settings panel** (gear, bottom-right): background source, change frequency
  (every tab / hourly / daily / never), blur, brightness, tint, weather, quick
  links, and more. Settings persist in `localStorage`.

## Use it as your browser start page

It's a single static file, so you have two options:

- **Host it (recommended).** Put `index.html` on any static host — your own
  domain, GitHub Pages, Netlify, etc. — then set it as your browser's homepage and
  new-tab page. A real `https` origin gives you three things a local file can't:
  the search box can **auto-focus on new tabs/windows**, `localStorage` is
  rock-solid, and the address bar shows a clean URL.
- **Open it locally.** Point your homepage at `file:///path/to/index.html` — zero
  setup, but see the focus note below.

In Safari: **Settings → General → Homepage**, then set **New windows** and
**New tabs** to open with **Homepage**. Turn on **Focus box on load** in the
settings panel to land your cursor in the search box.

### About cursor focus

One Safari quirk: when opened from a **local `file://`**, Safari insists on
focusing its *own* address bar for new tabs and a page can't override it — so
"Focus box on load" appears to do nothing there. Served from a real **`http(s)`
origin it works as expected.** (Either way, `⌘L` always focuses Safari's address
bar, with full history/autocomplete.)

## Compliance / data

- No analytics, no cookies, no accounts. Settings stay in your browser.
- Backgrounds use only **keyless** providers, within their intended use:
  - Picsum images come from Unsplash; we display the photographer credit with a
    referral link.
  - We deliberately **do not** embed an Unsplash/Pexels API key or proxy through
    anyone else's backend — that would breach those APIs' terms.
- Local-folder mode is fully offline.
- Ships with `<meta name="robots" content="noindex, nofollow">` so a hosted copy
  stays out of search results — remove it if you want it indexed.

## License

[MIT](LICENSE).
