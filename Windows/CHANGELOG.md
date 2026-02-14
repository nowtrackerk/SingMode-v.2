# SingMode Command - Changelog

## Version 1.0.2 (2026-02-11)

### Features
- **Network IP Configuration UI**: Added user-friendly modal to configure network IP for mobile access
- **QR Code Mobile Access**: QR codes now use network IP instead of localhost, enabling phone connections
- **Network Warning**: Visual warning displayed when using localhost with instructions to configure network IP

### Technical Changes
- Created `networkUtils.ts` for network IP detection and storage
- Updated Vite config to listen on `0.0.0.0` (all network interfaces)
- Modified QR code generation in App.tsx, DJView.tsx, and StageView.tsx to use network utility
- Added localStorage persistence for network IP configuration

### Documentation
- Updated installation instructions with network configuration steps
- Added network requirements section (Wi-Fi, firewall, port 5173)
- Enhanced Windows installer README with clearer build instructions

---

## Version 1.0.1 (2026-02-11)

### Bug Fixes
- **Fixed local connectivity issue**: DJ console now properly sees users joining from the same device/browser
- **Fixed real-time sync**: Requests and participant updates now appear instantly in DJ console
- **Fixed storage event handling**: Both `kstar_sync` and `storage` events are now dispatched consistently

### Technical Changes
- Modified `sessionManager.ts` storage layer to always dispatch sync events
- Improved event handling for both Chrome extension and localStorage modes
- Enhanced cross-view synchronization mechanism

### Documentation
- Updated Windows installer README with clearer instructions
- Added version tracking to installer package.json
- Updated app description with latest features and fixes

---

## Version 1.0.0 (Initial Release)

### Features
- DJ Command Center with queue management
- Smartphone-as-microphone functionality
- Stage View with dynamic visuals (Pro)
- AI-powered DJ introductions
- Verified songbook management
- Real-time chat and ticker messages
- User profile system with favorites and history
