# SingMode Command: Windows 11 Deployment Guide
**Professional Karaoke System v1.0.2**

---

## 📋 Overview
SingMode Command is a high-performance karaoke hosting platform designed for Windows 11. It centralizes performance management, utilizes AI for DJ transitions, and leverages smartphones as wireless vocal links.

## 💻 System Requirements
| Component | Minimum | Recommended |
| :--- | :--- | :--- |
| **OS** | Windows 11 | Windows 11 (Latest Update) |
| **Processor** | Intel Core i5 | Intel Core i7 (12th Gen+) |
| **Memory** | 8GB RAM | 16GB RAM |
| **Network** | 2.4GHz Wi-Fi | 5GHz Wi-Fi (for low-latency audio) |
| **Display** | 1080p | 4K (for Stage View) |

---

## 🚀 Installation Steps

### 1. Environment Setup
1. Download **Node.js (LTS)** from [nodejs.org](https://nodejs.org/).
2. Run the installer and ensure "Add to PATH" is checked.
3. Restart your computer after installation.

### 2. Launching the Application
1. Navigate to your `SingMode` root folder.
2. Locate the `Windows` directory.
3. Double-click **`start_dev_server.bat`**.
   - *This will launch the host server and open the DJ Console in your default browser.*

### 3. Creating a Standalone Executable (Optional)
To run SingMode without a terminal:
1. Double-click **`build_installer.bat`** in the `Windows` folder.
2. Wait for the build to complete.
3. Locate the installer in `Windows/installer/release/`.
4. Run the generated `.exe` to install SingMode as a native Windows app.

---

## 🌐 Networking & Connectivity
SingMode relies on a local network bridge to connect guest smartphones.

### Static IP Configuration
1. Open the **DJ Console** on your PC.
2. Note the **Network IP** displayed (e.g., `192.168.x.x`).
3. Click **"Configure Network IP"** in the UI.
4. Enter the noted IP to ensure QR codes point to the correct host address.

### Firewall Settings
- Ensure **Windows Defender Firewall** is not blocking "Node.js JavaScript Runtime".
- If mobile devices cannot connect, set your network profile to **Private** instead of Public.

---

## 🎙️ Using Smartphone Microphones
1. **QR Scan**: Guests scan the on-screen QR code.
2. **Authorize**: DJ clicks the mic icon in the Console.
3. **Connect**: Guest clicks "Authorize" on their phone to start the Wireless Vocal Link.

---
*© 2026 SingMode Team. All rights reserved.*
