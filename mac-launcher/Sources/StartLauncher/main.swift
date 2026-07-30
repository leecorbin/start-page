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

// Container: a slim toolbar strip on top (shown while browsing) that slides in/out, the web view below.
final class RootView: NSView {
    let strip = NSVisualEffectView()
    let web: WKWebView
    let stripHeight: CGFloat = 38
    private var heightC: NSLayoutConstraint!
    private var shown = false

    init(web: WKWebView, toolbar: NSView) {
        self.web = web
        super.init(frame: .zero)
        strip.material = .headerView
        strip.blendingMode = .withinWindow
        strip.isHidden = true
        for v in [strip, web, toolbar] { v.translatesAutoresizingMaskIntoConstraints = false }
        strip.addSubview(toolbar)
        addSubview(web); addSubview(strip)
        heightC = strip.heightAnchor.constraint(equalToConstant: 0)
        NSLayoutConstraint.activate([
            strip.topAnchor.constraint(equalTo: topAnchor),
            strip.leadingAnchor.constraint(equalTo: leadingAnchor),
            strip.trailingAnchor.constraint(equalTo: trailingAnchor),
            heightC,
            web.topAnchor.constraint(equalTo: strip.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: leadingAnchor),
            web.trailingAnchor.constraint(equalTo: trailingAnchor),
            web.bottomAnchor.constraint(equalTo: bottomAnchor),
            toolbar.leadingAnchor.constraint(equalTo: strip.leadingAnchor, constant: 82),   // clear of the traffic lights
            toolbar.centerYAnchor.constraint(equalTo: strip.centerYAnchor),
        ])
    }
    required init?(coder: NSCoder) { fatalError("no coder") }

    func setStrip(_ show: Bool) {
        guard show != shown else { return }
        shown = show
        if show { strip.isHidden = false }
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.2
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            ctx.allowsImplicitAnimation = true
            self.heightC.constant = show ? self.stripHeight : 0
            self.layoutSubtreeIfNeeded()
        }, completionHandler: { if !show { self.strip.isHidden = true } })
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
        web.load(startRequest())
    }
    // Always fetch the start page fresh — never a stale cached copy after you redeploy.
    // (Subresources still cache normally; the plugins carry their own ?v= cache-buster.)
    func startRequest() -> URLRequest { URLRequest(url: launcherURL(), cachePolicy: .reloadIgnoringLocalCacheData) }
    func reloadStart() { web.load(startRequest()) }

    // ---- panel + browse toolbar, minimal chrome, remembered frame ----
    func buildPanel() {
        backBtn = toolBtn("chevron.left", #selector(goBack))
        fwdBtn  = toolBtn("chevron.right", #selector(goForward))
        let reloadBtn = toolBtn("arrow.clockwise", #selector(reloadPage))
        for b in [backBtn!, fwdBtn!, reloadBtn] {
            b.translatesAutoresizingMaskIntoConstraints = false
            b.widthAnchor.constraint(equalToConstant: 22).isActive = true
            b.heightAnchor.constraint(equalToConstant: 22).isActive = true
        }
        let toolbar = NSStackView(views: [backBtn, fwdBtn, reloadBtn])
        toolbar.orientation = .horizontal
        toolbar.spacing = 8
        root = RootView(web: web, toolbar: toolbar)

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
        root.setStrip(!isStartPage(web.url))                            // toolbar slides in only while browsing
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
            if ev.modifierFlags.contains(.command) { self.hide(); return nil }   // ⌘Esc → dismiss immediately
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
            web.load(startRequest())                                    // browsed away → fresh start page
        }
    }
    func hide() { panel.orderOut(nil) }
    func focusSearch() { web.evaluateJavaScript("var q=document.getElementById('q'); if(q){q.focus(); q.select();}", completionHandler: nil) }

    @objc func reloadPage() { web.reloadFromOrigin() }                  // hard reload of whatever's showing (cold-reloads the start page too)
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
