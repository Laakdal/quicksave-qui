# Project Quicksave GUI

Project Quicksave GUI is a Tauri desktop application for working with Euro Truck Simulator 2 (ETS2) and American Truck Simulator (ATS) save files. It provides a native interface for decrypting, viewing, and editing `.sii` save data without leaving the app.

The project combines a React frontend with a Rust/Tauri backend for local file access, save parsing, decryption, and save-management actions.

## Supported Games

- Euro Truck Simulator 2

## Features

- Decrypt and inspect ETS2/ATS `.sii` save files.
- Edit save data directly with an embedded Monaco Editor.
- Browse save information through the save manager interface.
- View and manage owned trucks and trailers in dedicated data tables.
- Run common vehicle actions such as repair and refuel from the save editor.
- Use SCS utility pages for SCS, SXC, PIX, TOBJ, and DEF workflows.
- Work in a custom Tauri desktop shell with native filesystem integration.

## Typical Workflow

1. Open the app and choose a quicksave or save file to inspect.
2. Decrypt the save data into readable `.sii` text.
3. Review the save in the Monaco editor or structured save-manager views.
4. Apply supported edits, such as vehicle repair or refuel actions.
5. Save or export the modified data back into your save workflow.

Always back up your original save files before editing them.

## Development Setup

### Requirements

- Node.js 18 or newer
- Rust toolchain, latest stable recommended
- Tauri platform build dependencies
  - On Windows, install the Microsoft C++ Build Tools / MSVC toolchain.

### Commands

```bash
# Install frontend dependencies
npm install

# Run the Tauri development app with hot reload
npm run tauri dev

# Type-check and build the frontend
npm run build

# Build the production desktop application
npm run tauri build
```

## Project Structure

- `src/` - React frontend source.
- `src/pages/` - Main app pages, including quicksave, settings, home, and SCS tool views.
- `src/components/` - Shared UI, layout, editor, table, and toolbar components.
- `src-tauri/` - Tauri application shell, Rust backend, capabilities, and build configuration.
- `src-tauri/src/` - Rust commands and save/SII processing modules.
- `src-tauri/src/save_manager/` - Save-manager data extraction and vehicle-related helpers.
- `src-tauri/src/sii/` - SII parsing, decryption, and text handling logic.

## Status

Project Quicksave GUI is currently an early desktop tool (`0.1.0`). The app is intended for local save-file workflows and active development, so keep backups of saves before testing edits or running new save-management actions.
