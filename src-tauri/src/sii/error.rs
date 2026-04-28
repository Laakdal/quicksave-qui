//! Error types for the SII decryption and decoding pipeline.

use std::fmt;

/// All errors that can occur during SII file processing.
#[derive(Debug)]
pub enum SiiError {
    /// The file is too short or truncated.
    UnexpectedEof,
    /// An unrecognised file signature was encountered.
    UnknownSignature(u32),
    /// The BSII format version is not supported.
    UnsupportedVersion(u32),
    /// AES decryption failed.
    DecryptionFailed(String),
    /// Zlib decompression failed.
    DecompressionFailed(String),
    /// A UTF-8 string in the binary data was invalid.
    InvalidUtf8(std::string::FromUtf8Error),
    /// A generic I/O error.
    Io(std::io::Error),
    /// Catch-all for other errors.
    Other(String),
}

impl fmt::Display for SiiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnexpectedEof => write!(f, "unexpected end of file"),
            Self::UnknownSignature(sig) => write!(f, "unknown file signature: 0x{sig:08X}"),
            Self::UnsupportedVersion(v) => write!(f, "unsupported BSII version: {v}"),
            Self::DecryptionFailed(msg) => write!(f, "decryption failed: {msg}"),
            Self::DecompressionFailed(msg) => write!(f, "decompression failed: {msg}"),
            Self::InvalidUtf8(e) => write!(f, "invalid UTF-8: {e}"),
            Self::Io(e) => write!(f, "I/O error: {e}"),
            Self::Other(msg) => write!(f, "{msg}"),
        }
    }
}

impl std::error::Error for SiiError {}

impl From<std::io::Error> for SiiError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

impl From<std::string::FromUtf8Error> for SiiError {
    fn from(e: std::string::FromUtf8Error) -> Self {
        Self::InvalidUtf8(e)
    }
}

pub type SiiResult<T> = Result<T, SiiError>;
