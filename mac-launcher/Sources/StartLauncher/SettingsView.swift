import SwiftUI
import AppKit
import Carbon

struct SettingsView: View {
    @AppStorage("startURL") private var startURL = kDefaultStartURL
    @AppStorage("openInBrowser") private var openInBrowser = false
    @AppStorage("dismissOnExternal") private var dismissOnExternal = true
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("hotkeyCode") private var hotkeyCode = Int(kVK_Space)
    @AppStorage("hotkeyMods") private var hotkeyMods = Int(optionKey)
    @AppStorage("hotkeyLabel") private var hotkeyLabel = "Space"

    var body: some View {
        Form {
            Section("Start page") {
                TextField("URL", text: $startURL)
                    .onSubmit { AppDelegate.shared.reloadStart() }
                Text("Loaded with ?launcher=1 so the page can tailor itself. Press Return to apply.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Section("Search results") {
                Picker("Open in", selection: $openInBrowser) {
                    Text("The panel").tag(false)
                    Text("Your browser").tag(true)
                }
                Toggle("Dismiss the launcher after opening in the browser", isOn: $dismissOnExternal)
                    .disabled(!openInBrowser)
            }
            Section("Hotkey") {
                HotkeyField(code: $hotkeyCode, mods: $hotkeyMods, label: $hotkeyLabel) {
                    AppDelegate.shared.applyHotKey()
                }
            }
            Section {
                Toggle("Launch at login", isOn: $launchAtLogin)
                    .onChange(of: launchAtLogin) { _, on in AppDelegate.shared.setLoginItem(on) }
            }
        }
        .formStyle(.grouped)
        .frame(width: 420, height: 440)   // explicit size so NSHostingController sizes the window (else it collapses)
    }
}

// A click-to-record shortcut field: captures the next modified key combo and re-registers the hotkey.
struct HotkeyField: View {
    @Binding var code: Int
    @Binding var mods: Int
    @Binding var label: String
    var onChange: () -> Void
    @State private var recording = false
    @State private var monitor: Any?

    var body: some View {
        HStack {
            Text("Global shortcut")
            Spacer()
            Button(recording ? "Press a shortcut…  (esc to cancel)" : modSymbols(UInt32(mods)) + label) {
                recording ? stop() : start()
            }
            .frame(minWidth: 190)
        }
    }

    private func start() {
        recording = true
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { ev in
            if ev.keyCode == 53 { stop(); return nil }               // Esc cancels recording
            let m = carbonFlags(ev.modifierFlags)
            if m == 0 { return nil }                                  // need at least one modifier for a usable global hotkey
            code = Int(ev.keyCode); mods = Int(m); label = keyLabel(ev)
            stop(); onChange()
            return nil
        }
    }
    private func stop() {
        recording = false
        if let m = monitor { NSEvent.removeMonitor(m); monitor = nil }
    }
}

// ---- Cocoa modifier flags → Carbon mask, and pretty display ----
func carbonFlags(_ f: NSEvent.ModifierFlags) -> UInt32 {
    var m: UInt32 = 0
    if f.contains(.control) { m |= UInt32(controlKey) }
    if f.contains(.option)  { m |= UInt32(optionKey) }
    if f.contains(.shift)   { m |= UInt32(shiftKey) }
    if f.contains(.command) { m |= UInt32(cmdKey) }
    return m
}
func modSymbols(_ m: UInt32) -> String {
    var s = ""
    if m & UInt32(controlKey) != 0 { s += "⌃" }
    if m & UInt32(optionKey)  != 0 { s += "⌥" }
    if m & UInt32(shiftKey)   != 0 { s += "⇧" }
    if m & UInt32(cmdKey)     != 0 { s += "⌘" }
    return s
}
func keyLabel(_ ev: NSEvent) -> String {
    switch Int(ev.keyCode) {
    case kVK_Space: return "Space"
    case kVK_Return, kVK_ANSI_KeypadEnter: return "Return"
    case kVK_Tab: return "Tab"
    case kVK_LeftArrow: return "←"
    case kVK_RightArrow: return "→"
    case kVK_UpArrow: return "↑"
    case kVK_DownArrow: return "↓"
    default:
        let c = ev.charactersIgnoringModifiers ?? ""
        return c.isEmpty ? "Key \(ev.keyCode)" : c.uppercased()
    }
}
