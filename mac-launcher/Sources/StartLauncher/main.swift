import Cocoa
import WebKit
import SwiftUI
import Carbon
import ServiceManagement

let kDefaultStartURL = "https://corbin.uk/start"
let kDefaultSize = NSSize(width: 720, height: 520)

// Encode a Swift string as a safe JavaScript string literal (for evaluateJavaScript).
func jsString(_ s: String) -> String {
    var r = "\""
    for c in s.unicodeScalars {
        switch c {
        case "\\": r += "\\\\"
        case "\"": r += "\\\""
        case "\n": r += "\\n"
        case "\r": r += "\\r"
        case "\u{2028}": r += "\\u2028"
        case "\u{2029}": r += "\\u2029"
        default: r.unicodeScalars.append(c)
        }
    }
    return r + "\""
}

// A panel that can take keyboard focus, so you can type your search into it.
final class KeyPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

// Container: an optional slim toolbar strip on top (shown while browsing), the web view below.
final class RootView: NSView {
    var webView: NSView?
    let strip = NSVisualEffectView()
    let stripHeight: CGFloat = 38
    var showStrip = false { didSet { if showStrip != oldValue { strip.isHidden = !showStrip; needsLayout = true } } }

    override func layout() {
        super.layout()
        let w = bounds.width, h = bounds.height
        let s = showStrip ? stripHeight : 0
        strip.frame = NSRect(x: 0, y: h - s, width: w, height: s)          // top
        webView?.frame = NSRect(x: 0, y: 0, width: w, height: h - s)       // fills the rest
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    static var shared: AppDelegate!

    var panel: KeyPanel!
    var web: WKWebView!
    var root: RootView!
    var backBtn: NSButton!
    var fwdBtn: NSButton!
    var statusItem: NSStatusItem!
    var statusMenu: NSMenu!
    var settingsWindow: NSWindow?
    var escMonitor: Any?
    let hotKey = HotKeyManager()
    // last omnibox query the page reported, re-injected after an Esc-back
    var lastQueryText = ""
    var lastQueryBang = ""
    var pendingRestore = false

    // ---- settings (UserDefaults; the SwiftUI SettingsView writes the same keys) ----
    private var d: UserDefaults { .standard }
    func cfgStartURL() -> String { let s = d.string(forKey: "startURL"); return (s?.isEmpty == false) ? s! : kDefaultStartURL }
    func cfgOpenInBrowser() -> Bool { d.bool(forKey: "openInBrowser") }
    func cfgDismissOnExternal() -> Bool { d.object(forKey: "dismissOnExternal") as? Bool ?? true }
    func cfgHotKeyCode() -> UInt32 { UInt32(d.object(forKey: "hotkeyCode") as? Int ?? Int(kVK_Space)) }
    func cfgHotKeyMods() -> UInt32 { UInt32(d.object(forKey: "hotkeyMods") as? Int ?? Int(optionKey)) }

    func applicationDidFinishLaunching(_ note: Notification) {
        AppDelegate.shared = self
        NSApp.setActivationPolicy(.accessory)
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
        cfg.websiteDataStore = .default()
        let ucc = WKUserContentController()
        ucc.add(self, name: "launcher")
        cfg.userContentController = ucc
        web = WKWebView(frame: NSRect(origin: .zero, size: kDefaultSize), configuration: cfg)
        web.navigationDelegate = self
        web.load(URLRequest(url: launcherURL()))
    }
    func reloadStart() { web.load(URLRequest(url: launcherURL())) }

    // ---- panel + browse toolbar, minimal chrome, remembered frame ----
    func buildPanel() {
        backBtn = toolBtn("chevron.left", #selector(goBack));    backBtn.frame = NSRect(x: 84, y: 8, width: 22, height: 22)
        fwdBtn  = toolBtn("chevron.right", #selector(goForward)); fwdBtn.frame  = NSRect(x: 112, y: 8, width: 22, height: 22)
        let reloadBtn = toolBtn("arrow.clockwise", #selector(reloadPage)); reloadBtn.frame = NSRect(x: 146, y: 8, width: 22, height: 22)

        root = RootView(frame: NSRect(origin: .zero, size: kDefaultSize))
        root.strip.material = .headerView
        root.strip.blendingMode = .withinWindow
        root.strip.isHidden = true
        [backBtn, fwdBtn, reloadBtn].forEach { root.strip.addSubview($0) }
        root.webView = web
        root.addSubview(web)
        root.addSubview(root.strip)

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
        panel.standardWindowButton(.zoomButton)?.isHidden = true        // no maximise / zoom
        panel.standardWindowButton(.miniaturizeButton)?.isHidden = true
        panel.contentView = root
        panel.setFrameAutosaveName("StartLauncherPanel")
        if !panel.setFrameUsingName("StartLauncherPanel") { panel.center() }
    }

    func toolBtn(_ symbol: String, _ action: Selector) -> NSButton {
        let b = NSButton()
        b.isBordered = false
        b.bezelStyle = .regularSquare
        b.imagePosition = .imageOnly
        b.image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)
        b.contentTintColor = .secondaryLabelColor
        b.target = self; b.action = action
        return b
    }
    @objc func goBack() { if web.canGoBack { web.goBack() } }
    @objc func goForward() { if web.canGoForward { web.goForward() } }
    func updateChrome() {
        root.showStrip = !isStartPage(web.url)                          // toolbar only while browsing
        backBtn.isEnabled = web.canGoBack
        fwdBtn.isEnabled = web.canGoForward
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
            statusItem.menu = nil
        } else { toggle() }
    }

    // ---- Esc: on a result page → jump history back to the start page; on the start page → hand to the page ----
    func installEscapeMonitor() {
        escMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] ev in
            guard let self = self, self.panel.isKeyWindow, ev.keyCode == 53 else { return ev }
            if self.isStartPage(self.web.url) { return ev }
            if let item = self.startPageBackItem() {
                self.pendingRestore = true                       // put the query back once we're home
                self.web.go(to: item)
            } else {
                self.hide()
            }
            return nil
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
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) { updateChrome() }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        updateChrome()
        if pendingRestore && isStartPage(web.url) {
            pendingRestore = false
            let js = "window.__launcherRestore && window.__launcherRestore(\(jsString(lastQueryText)), \(jsString(lastQueryBang)))"
            web.evaluateJavaScript(js, completionHandler: nil)
        } else if panel.isKeyWindow {
            focusSearch()
        }
    }

    // ---- page → app bridge ----
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "launcher" else { return }
        if (message.body as? String) == "close" { hide() }
        else if let m = message.body as? [String: Any], (m["type"] as? String) == "q" {
            lastQueryText = m["text"] as? String ?? ""
            lastQueryBang = m["bang"] as? String ?? ""
        }
    }

    func applyHotKey() { hotKey.register(keyCode: cfgHotKeyCode(), mods: cfgHotKeyMods()) }

    func setLoginItem(_ on: Bool) {
        do {
            if on { if SMAppService.mainApp.status != .enabled { try SMAppService.mainApp.register() } }
            else  { if SMAppService.mainApp.status == .enabled { try SMAppService.mainApp.unregister() } }
        } catch { NSLog("Start Launcher — login item error: \(error.localizedDescription)") }
    }

    // ---- show / hide. A fresh summon starts clean; Esc-back keeps your query. ----
    @objc func toggle() { panel.isVisible ? hide() : show() }
    func show() {
        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)
        lastQueryText = ""; lastQueryBang = ""                          // a fresh summon starts clean
        if isStartPage(web.url) {
            web.evaluateJavaScript("window.__launcherHome && window.__launcherHome()", completionHandler: nil)  // clean slate
        } else {
            web.load(URLRequest(url: launcherURL()))                    // browsed away → fresh start page
        }
    }
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
            w.level = .floating
            settingsWindow = w
        }
        hide()                                                          // move the popup out of the way
        NSApp.activate(ignoringOtherApps: true)
        settingsWindow?.center()
        settingsWindow?.makeKeyAndOrderFront(nil)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
