import Cocoa
import WebKit
import Carbon

// ============================ configuration ============================
// The page the launcher shows. Hosted, so it's always current and import()
// plugins work (they can't from file://).
let kStartURL = URL(string: "https://corbin.uk/start")!

// Global hotkey — ⌥Space by default (Spotlight owns ⌘Space, so we avoid it).
// To change: swap the keycode and/or modifiers below.
//   keycodes:   kVK_Space, kVK_ANSI_K, kVK_F1 … (Carbon virtual keycodes)
//   modifiers:  cmdKey, optionKey, controlKey, shiftKey  (combine with |)
let kHotKeyCode: UInt32 = UInt32(kVK_Space)
let kHotKeyMods: UInt32 = UInt32(optionKey)

// Default window size — bigger than Spotlight, smaller than a full Safari window.
// After you first move/resize it, the position and size are remembered.
let kDefaultSize = NSSize(width: 720, height: 520)

// A panel that can take keyboard focus, so you can type your search into it.
final class KeyPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var panel: KeyPanel!
    var web: WKWebView!
    var statusItem: NSStatusItem!
    var statusMenu: NSMenu!
    var hotKeyRef: EventHotKeyRef?
    var escMonitor: Any?

    func applicationDidFinishLaunching(_ note: Notification) {
        NSApp.setActivationPolicy(.accessory)   // menu-bar resident, no Dock icon
        buildWebView()
        buildPanel()
        buildStatusItem()
        installEscapeMonitor()
        registerHotKey()
        // Stays hidden on launch — summon it with the hotkey or the menu-bar icon.
    }

    // ---- web view (persistent store, so your settings/searches stick) ----
    func buildWebView() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        web = WKWebView(frame: NSRect(origin: .zero, size: kDefaultSize), configuration: cfg)
        web.navigationDelegate = self
        web.load(URLRequest(url: kStartURL))
    }

    // ---- floating panel with minimal chrome ----
    func buildPanel() {
        panel = KeyPanel(contentRect: NSRect(origin: .zero, size: kDefaultSize),
                         styleMask: [.titled, .closable, .resizable, .fullSizeContentView],
                         backing: .buffered, defer: false)
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.level = .floating
        panel.hidesOnDeactivate = true                     // click away → it hides (Spotlight-style)
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isReleasedWhenClosed = false
        panel.contentView = web
        panel.setFrameAutosaveName("StartLauncherPanel")   // remembers size + position
        if !panel.setFrameUsingName("StartLauncherPanel") { panel.center() }
    }

    // ---- menu-bar icon: left-click toggles, right-click opens the menu ----
    func buildStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let btn = statusItem.button {
            btn.image = NSImage(systemSymbolName: "magnifyingglass.circle", accessibilityDescription: "Start")
            btn.image?.isTemplate = true
            btn.target = self
            btn.action = #selector(statusClick)
            btn.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }
        statusMenu = NSMenu()
        statusMenu.addItem(withTitle: "Show / Hide  (⌥Space)", action: #selector(toggle), keyEquivalent: "")
        statusMenu.addItem(.separator())
        statusMenu.addItem(withTitle: "Reload", action: #selector(reloadPage), keyEquivalent: "")
        statusMenu.addItem(withTitle: "Quit Start Launcher", action: #selector(quit), keyEquivalent: "q")
        statusMenu.items.forEach { $0.target = self }
    }

    @objc func statusClick() {
        if let ev = NSApp.currentEvent, ev.type == .rightMouseUp || ev.modifierFlags.contains(.control) {
            statusItem.menu = statusMenu
            statusItem.button?.performClick(nil)
            statusItem.menu = nil                          // reset so a plain left-click toggles next time
        } else {
            toggle()
        }
    }

    // ---- Escape hides the panel ----
    func installEscapeMonitor() {
        escMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] ev in
            guard let self = self else { return ev }
            if ev.keyCode == 53 && self.panel.isVisible {   // 53 = Escape
                self.hide()
                return nil                                  // swallow it
            }
            return ev
        }
    }

    // ---- global hotkey (Carbon RegisterEventHotKey — needs no Accessibility permission) ----
    func registerHotKey() {
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let handler: EventHandlerUPP = { (_, _, userData) -> OSStatus in
            if let userData = userData {
                Unmanaged<AppDelegate>.fromOpaque(userData).takeUnretainedValue().toggle()
            }
            return noErr
        }
        InstallEventHandler(GetApplicationEventTarget(), handler, 1, &spec,
                            Unmanaged.passUnretained(self).toOpaque(), nil)
        let hkID = EventHotKeyID(signature: OSType(0x53544C31), id: 1)   // 'STL1'
        RegisterEventHotKey(kHotKeyCode, kHotKeyMods, hkID, GetApplicationEventTarget(), 0, &hotKeyRef)
    }

    // ---- show / hide ----
    @objc func toggle() { panel.isVisible ? hide() : show() }

    func show() {
        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)
        focusSearch()
    }
    func hide() { panel.orderOut(nil) }

    func focusSearch() {
        web.evaluateJavaScript("var q=document.getElementById('q'); if(q){q.focus(); q.select();}", completionHandler: nil)
    }

    @objc func reloadPage() { web.reload() }
    @objc func quit() { NSApp.terminate(nil) }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if panel.isVisible { focusSearch() }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
