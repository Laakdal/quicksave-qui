//! SII file signature types.
//!
//! The first 4 bytes of an SII file identify its format. These magic numbers
//! are compared as little-endian `u32` values (i.e. the byte sequence on disk).

/// Known SII file signatures.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Signature {
    /// `SiiN` — plain-text SiiNunit format.
    PlainText,
    /// `ScsC` — AES-CBC encrypted + zlib-compressed.
    Encrypted,
    /// `BSII` — binary SII format.
    Binary,
    /// `3nK\n` — not yet supported.
    ThreeNK,
}

impl Signature {
    /// The raw little-endian `u32` for each signature.
    pub const PLAIN_TEXT: u32 = 0x4E69_6953; // "SiiN" as LE u32
    pub const ENCRYPTED: u32 = 0x4373_6353; // "ScsC" as LE u32
    pub const BINARY: u32 = 0x4949_5342;    // "BSII" as LE u32
    pub const THREE_NK: u32 = 0x0A4B_6E33;  // "3nK\n" as LE u32

    /// Try to identify a signature from a raw `u32`.
    pub fn from_u32(value: u32) -> Option<Self> {
        match value {
            Self::PLAIN_TEXT => Some(Self::PlainText),
            Self::ENCRYPTED => Some(Self::Encrypted),
            Self::BINARY => Some(Self::Binary),
            Self::THREE_NK => Some(Self::ThreeNK),
            _ => None,
        }
    }
}
