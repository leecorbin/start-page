#!/bin/bash
# Build StartLauncher.app from source with swiftc — no Xcode project needed.
set -e
cd "$(dirname "$0")"

APP="StartLauncher.app"
BIN="$APP/Contents/MacOS/StartLauncher"

echo "Compiling…"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
swiftc -O -swift-version 5 -target arm64-apple-macos14.0 \
    -framework Cocoa -framework WebKit -framework SwiftUI -framework Carbon -framework ServiceManagement \
    -o "$BIN" \
    Sources/StartLauncher/*.swift

cp Info.plist "$APP/Contents/Info.plist"

# Ad-hoc code signature — keeps Gatekeeper and WKWebView happy for local use.
codesign --force --sign - "$APP" 2>/dev/null || true

echo "Built $APP"
echo "Run it:   open $APP"
echo "A magnifying-glass icon appears in the menu bar. Press ⌥Space to summon it."
