# Hex Commands Design

## Overview
Implement manual hex encoding and decoding as Tauri commands in `src-tauri/src/commands/hex.rs`.

## Commands

### `encode_hex`
- **Input**: `input: String`
- **Output**: `String` (lowercase hex)
- **Logic**: Convert each byte of the UTF-8 string into two hexadecimal characters.

### `decode_hex`
- **Input**: `hex: String`
- **Output**: `Result<String, String>`
- **Logic**: 
  - Validate hex string length (must be even).
  - Parse pairs of hex characters into bytes.
  - Convert bytes back to a UTF-8 string.
  - Return error if invalid hex or invalid UTF-8.

## Implementation Details
- No external dependencies (manual implementation).
- Register commands in `src-tauri/src/lib.rs`.
- Expose via `src-tauri/src/commands/mod.rs`.

## Testing Strategy
- Unit tests in `src-tauri/src/commands/hex.rs`.
- Test cases:
  - "Nightingale" -> "4e69676874696e67616c65"
  - Empty string.
  - Invalid hex characters.
  - Odd-length hex string.
  - Non-UTF8 byte sequences (for decoding).
