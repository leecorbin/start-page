import Cocoa
import WebKit
import SwiftUI
import Carbon
import ServiceManagement

let kDefaultStartURL = "https://corbin.uk/start"
let kDefaultSize = NSSize(width: 720, height: 520)

// A panel that can take keyboard focus, so you can type your search into it.
final class KeyPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    static var shared: AppDelegate!

    var panel: KeyPanel!
    var web: WKWebView!
    var statusItem: NSStatusItem!
    var statusMenu: NSMenu!
    var settingsWindow: NSWindow?
    var escMonitor: Any?
    let hotKey = HotKeyManager()

    // ---- settings (UserDefaults; the SwiftUI SettingsView writes the same keys) ----
    private var d: UserDefaults { .standard }
    func cfgStartURL() -> String { let s = d.string(forKey: "startURL"); return (s?.isEmpty == false) ? s! : kDefaultStartURL }
    func cfgOpenInBrowser() -> Bool { d.bool(forKey: "openInBrowser") }                                   // default false (panel)
    func cfgDismissOnExternal() -> Bool { d.object(forKey: "dismissOnExternal") as? Bool ?? true }        // default true
    func cfgHotKeyCode() -> UInt32 { UInt32(d.object(forKey: "hotkeyCode") as? Int ?? Int(kVK_Space)) }
    func cfgHotKeyMods() -> UInt32 { UInt32(d.object(forKey: "hotkeyMods") as? Int ?? Int(optionKey)) }

    func applicationDidFinishLaunching(_ note: Notification) {
        AppDelegate.shared = self
        NSApp.setActivationPolicy(.accessory)          // menu-bar resident, no Dock icon
        buildWebView()
        buildPanel()
        buildStatusItem()
        installEscapeMonitor()
        hotKey.onFire = { [weak self] in self?.toggle() }
        applyHotKey()
    }

    // ---- the URL to load: adds ?launcher=1, merged with any existing query ----
    func launcherURL() -> URL {
        let base = URL(string: cfgStartURL()) ?? URL(string: kDefaultStartURL)!
        guard var comps = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return base }
        var items = comps.queryItems ?? []
        if !items.contains(where: { $0.name == "launcher" }) { items.append(URLQueryItem(name: "launcher", value: "1")) }
        comps.queryItems = items
        return comps.url ?? base
    }

    func buildWebView() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()              // persistent — your settings/searches stick
        let ucc = WKUserContentController()
        ucc.add(self, name: "launcher")                // page → app bridge: window.webkit.messageHandlers.launcher
        cfg.userContentController = ucc
        web = WKWebView(frame: NSRect(origin: .zero, size: kDefaultSize), configuration: cfg)
        web.navigationDelegate = self
        web.load(URLRequest(url: launcherURL()))
    }
    func reloadStart() { web.load(URLRequest(url: launcherURL())) }

    // ---- floating panel, minimal chrome, remembered frame ----
    func buildPanel() {
        panel = KeyPanel(contentRect: NSRect(origin: .zero, size: kDefaultSize),
                         styleMask: [.titled, .closable, .resizable, .fullSizeContentView],
                         backing: .buffered, defer: false)
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = true
        panel.level = .floating
        panel.hidesOnDeactivate = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isReleasedWhenClosed = false
        panel.contentView = web
        panel.setFrameAutosaveName("StartLauncherPanel")
        if !panel.setFrameUsingName("StartLauncherPanel") { panel.center() }
    }

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
        statusMenu.addItem(withTitle: "Show / Hide", action: #selector(toggle), keyEquivalent: "")
        statusMenu.addItem(withTitle: "Settings…", action: #selector(openSettings), keyEquivalent: ",")
        statusMenu.addItem(withTitle: "Reload", action: #selector(reloadPage), keyEquivalent: "")
        statusMenu.addItem(.separator())
        statusMenu.addItem(withTitle: "Quit Start Launcher", action: #selector(quit), keyEquivalent: "q")
        statusMenu.items.forEach { $0.target = self }
    }
    @objc func statusClick() {
        if let ev = NSApp.currentEvent, ev.type == .rightMouseUp || ev.modifierFlags.contains(.control) {
            statusItem.menu = statusMenu
            statusItem.button?.performClick(nil)
            statusItem.menu = nil                      // reset so a plain left-click toggles next time
        } else { toggle() }
    }

    // ---- Esc: on a result page → jump history back to the start page;
    //          on the start page → hand Esc to the page (it clears, then asks us to close). ----
    func installEscapeMonitor() {
        escMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] ev in
            guard let self = self, self.panel.isKeyWindow, ev.keyCode == 53 else { return ev }   // 53 = Esc
            if self.isStartPage(self.web.url) { return ev }                 // let the page decide (clear / close)
            if let item = self.startPageBackItem() {
                self.web.go(to: item)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { self.focusSearch() }
            } else {
                self.hide()                                                 // fallback: nothing to go back to
            }
            return nil                                                      // consumed
        }
    }
    func isStartPage(_ url: URL?) -> Bool {
        guard let url = url, let start = URL(string: cfgStartURL()) else { return false }
        return url.host == start.host && url.path == start.path
    }
    func startPageBackItem() -> WKBackForwardListItem? {
        web.backForwardList.backList.reversed().first(where: { isStartPage($0.url) })
    }

    // ---- optionally open outbound results in the default browser ----
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.targetFrame?.isMainFrame == true,
           let url = navigationAction.request.url,
           !isStartPage(url), cfgOpenInBrowser() {
            NSWorkspace.shared.open(url)
            if cfgDismissOnExternal() { hide() }
            decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    // ---- page → app bridge ----
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "launcher", (message.body as? String) == "close" { hide() }
    }

    // ---- hotkey ----
    func applyHotKey() { hotKey.register(keyCode: cfgHotKeyCode(), mods: cfgHotKeyMods()) }

    // ---- launch at login (macOS 13+; no scripting or helper app) ----
    func setLoginItem(_ on: Bool) {
        do {
            if on { if SMAppService.mainApp.status != .enabled { try SMAppService.mainApp.register() } }
            else  { if SMAppService.mainApp.status == .enabled { try SMAppService.mainApp.unregister() } }
        } catch { NSLog("Start Launcher — login item error: \(error.localizedDescription)") }
    }

    // ---- show / hide ----
    @objc func toggle() { panel.isVisible ? hide() : show() }
    func show() { NSApp.activate(ignoringOtherApps: true); panel.makeKeyAndOrderFront(nil); focusSearch() }
    func hide() { panel.orderOut(nil) }
    func focusSearch() { web.evaluateJavaScript("var q=document.getElementById('q'); if(q){q.focus(); q.select();}", completionHandler: nil) }

    @objc func reloadPage() { reloadStart() }
    @objc func quit() { NSApp.terminate(nil) }

    @objc func openSettings() {
        if settingsWindow == nil {
            let host = NSHostingController(rootView: SettingsView())
            let w = NSWindow(contentViewController: host)
            w.title = "Start Launcher Settings"
            w.styleMask = [.titled, .closable]
            w.isReleasedWhenClosed = false
            settingsWindow = w
        }
        NSApp.activate(ignoringOtherApps: true)
        settingsWindow?.center()
        settingsWindow?.makeKeyAndOrderFront(nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if panel.isKeyWindow { focusSearch() }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
