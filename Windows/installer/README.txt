# SINGMODE WINDOWS INSTALLER - BUILD INSTRUCTIONS

**Version:** 1.0.2

## Prerequisites
- Node.js must be installed (https://nodejs.org/)
- The project must be built first (run `npm run build` from project root to create `dist` folder)

## Setup
1. Open a terminal/command prompt in this folder (`Windows/installer`)
2. Run `npm install` to download Electron and builder tools

## Build Installer
- **Automated:** From the `Windows` folder, run `build_installer.bat`
- **Manual:** From this folder, run `npm run dist`
- The installer (.exe) will be created in the `release` folder

## Testing Before Build
- Run `npm start` from this folder to test the Electron app without building

## Important Notes
- The `dist` folder from the project root must be present in `Windows/installer/dist`
- The build script will automatically copy it if missing
- For distribution, use the generated Setup.exe from the `release` folder

