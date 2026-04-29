# Project Quicksave GUI

A Tauri-based desktop application for decrypting, viewing, and modifying Euro Truck Simulator 2 (ETS2) and American Truck Simulator (ATS) `.sii` save files.

## Architecture

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Monaco Editor
- **Backend**: Tauri v2, Rust
- **IPC**: Native drag-and-drop filesystem paths passed to Rust for native decryption.

## Features

- Native Rust `.sii` binary parsing and decryption.
- Embedded Monaco Editor for direct save file modification.
- Custom frameless window with native drag regions and inner-sidebar layout.
- Direct filesystem integration for drop-to-decrypt workflow.

## Development Setup

### Requirements
- Node.js >= 18
- Rust toolchain (latest stable)
- Tauri platform build dependencies (e.g., MSVC on Windows)

### Commands

```bash
# Install dependencies
npm install

# Run development server with HMR
npm run tauri dev

# Build production executable
npm run tauri build
```

## Repository Structure

- `src-tauri/` - Rust backend, capability configurations, and core decryption logic.
- `src/models/` - Core React views (`decryptor.tsx`, `settings.tsx`).
- `src/components/layout/` - Application frame, custom titlebar, and navigation elements.

## License
Personal use.