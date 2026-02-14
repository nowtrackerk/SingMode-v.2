# SINGMODE COMMAND - Professional Karaoke System

**Version:** 1.0.2
**Platform:** Windows / Web
**Host Requirements:** Windows 10/11, Google Chrome or Edge (Chromium)

## Overview
SingMode Command transforms your Windows PC into a professional karaoke station. It serves as the central "Host" for the party, managing the queue, displaying lyrics on the main screen (TV/Projector), and receiving audio from guest smartphones.

## Features

### 🎧 DJ Command Center
- **Performance Management:** Queue management, singer rotation, and stage activation.
- **Verified Songbook:** A persistent, editable library of verified high-quality karaoke tracks.
- **AI-Powered Intros:** Automatic DJ introductions generated for every song using advanced AI.
- **Atmosphere Control:** Manage background music and visual vibes.
- **Real-Time Sync:** Instant updates when users join or submit requests (local and remote).

### 📱 Smartphone-as-Mic
- **Zero App Download:** Guests join via QR code instantly.
- **Wireless Microphone:** Low-latency audio streaming from phone to host PC.
- **Remote Request:** Guests search and request songs directly from their device.
- **Instant Sync:** Requests appear immediately in DJ console.

### 📺 Stage View (Pro)
- **Dynamic Visuals:** AI-powered, beat-reactive visualizations that adapt to song mood.
- **Lyrics Display:** Clean, distraction-free lyrics for singers.
- **Ticker Tape:** Real-time messages and announcements.
- **Wireless Mic Indicator:** Visual feedback when smartphone microphones are active.

### 🤖 AI Integration
- **Smart Suggestions:** Context-aware song recommendations.
- **Vibe Coding:** AI analysis of song sentiment to adjust lighting and visuals.
- **Auto DJ Intros:** Personalized introductions for each performance.

## System Requirements
- **OS:** Windows 10 or 11
- **Processor:** Intel Core i5 or equivalent (i7 recommended for best video performance)
- **Memory:** 8GB RAM (16GB recommended)
- **Network:** Stable Wi-Fi connection (5GHz recommended for microphone streaming)
- **Browser:** Chrome, Edge, or any Chromium-based browser

## Installation Instructions
1.  **Install Node.js:** Download and install Node.js (LTS) from [nodejs.org](https://nodejs.org/).
2.  **Run Dev Server:** Double-click `start_dev_server.bat` to launch the development server.
3.  **Configure Network Access:**
    - When the server starts, look for the "Network" URL in the terminal (e.g., `http://192.168.0.160:5173`)
    - In the app, click "Configure Network IP" and enter this IP address
    - This allows phones on the same Wi-Fi network to connect via QR code
4.  **Build Installer (Optional):** Run `build_installer.bat` to create a standalone Windows executable.
5.  **Connect:** Point guest phones at the QR code on screen to join.

## Network Requirements
- **Same Wi-Fi Network:** All devices (PC and phones) must be on the same Wi-Fi network
- **Firewall:** Ensure Windows Firewall allows Node.js/Chrome to accept incoming connections
- **Port 5173:** The default development server port must be accessible on your local network

## Recent Updates (v1.0.2)
- **Fixed:** QR code mobile access - phones can now connect by scanning QR codes
- **Added:** Network IP configuration UI for easy mobile setup
- **Improved:** Vite server now listens on all network interfaces (0.0.0.0)
- **Enhanced:** Clear warnings and instructions when using localhost

## Previous Updates (v1.0.1)
- **Fixed:** Local connectivity issue where DJ console couldn't see users joining from the same device
- **Improved:** Real-time synchronization between DJ console and participant views
- **Enhanced:** Storage event handling for instant updates across all views

