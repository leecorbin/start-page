import Carbon

// Registers a single global hotkey via Carbon (no Accessibility permission needed).
// Re-register at any time to change the shortcut.
final class HotKeyManager {
    private var ref: EventHotKeyRef?
    private var handlerInstalled = false
    var onFire: (() -> Void)?

    func register(keyCode: UInt32, mods: UInt32) {
        unregister()
        if !handlerInstalled { installHandler(); handlerInstalled = true }
        let id = EventHotKeyID(signature: OSType(0x53544C31), id: 1)   // 'STL1'
        RegisterEventHotKey(keyCode, mods, id, GetApplicationEventTarget(), 0, &ref)
    }

    func unregister() {
        if let r = ref { UnregisterEventHotKey(r); ref = nil }
    }

    private func installHandler() {
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let callback: EventHandlerUPP = { (_, _, userData) -> OSStatus in
            if let userData = userData {
                Unmanaged<HotKeyManager>.fromOpaque(userData).takeUnretainedValue().onFire?()
            }
            return noErr
        }
        InstallEventHandler(GetApplicationEventTarget(), callback, 1, &spec,
                            Unmanaged.passUnretained(self).toOpaque(), nil)
    }
}
