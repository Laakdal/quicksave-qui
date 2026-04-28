//! SII file decryption, decoding, and serialisation.
//!
//! This module provides a complete pipeline for processing SII save files from
//! SCS Software games (Euro Truck Simulator 2, American Truck Simulator).
//!
//! # Supported formats
//!
//! | Signature | Description                           |
//! |-----------|---------------------------------------|
//! | `ScsC`    | AES-CBC encrypted + zlib compressed   |
//! | `BSII`    | Binary SII (decoded → SiiNunit text)  |
//! | `SiiN`    | Plain-text SiiNunit (returned as-is)  |
//!
//! # Example
//!
//! ```rust,no_run
//! let raw = std::fs::read("game.sii").unwrap();
//! let decoded = sii::process(&raw).unwrap();
//! std::fs::write("game.decrypted.sii", &decoded).unwrap();
//! ```

pub mod bsii_decoder;
pub mod bsii_serializer;
pub mod bsii_types;
pub mod decrypt;
pub mod error;
pub mod reader;
pub mod signature;

use error::{SiiError, SiiResult};
use signature::Signature;

/// Process a raw SII file buffer end-to-end.
///
/// 1. If encrypted (`ScsC`), decrypt + decompress.
/// 2. If binary (`BSII`), decode to SiiNunit text.
/// 3. If already plain text (`SiiN`), return as-is.
///
/// Returns the final SiiNunit text as UTF-8 bytes.
pub fn process(data: &[u8]) -> SiiResult<Vec<u8>> {
    if data.len() < 4 {
        return Err(SiiError::UnexpectedEof);
    }

    let sig = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);

    let working_data = match Signature::from_u32(sig) {
        Some(Signature::Encrypted) => {
            // Strip the 4-byte signature, then decrypt + decompress
            decrypt::decrypt_scsc(&data[4..])?
        }
        Some(Signature::Binary) | Some(Signature::PlainText) => {
            // Already decrypted — use as-is
            data.to_vec()
        }
        Some(Signature::ThreeNK) => {
            return Err(SiiError::Other("3nK format is not yet supported".into()));
        }
        None => {
            return Err(SiiError::UnknownSignature(sig));
        }
    };

    // Now identify the inner format
    if working_data.len() < 4 {
        return Err(SiiError::UnexpectedEof);
    }
    let inner_sig = u32::from_le_bytes([
        working_data[0],
        working_data[1],
        working_data[2],
        working_data[3],
    ]);

    match Signature::from_u32(inner_sig) {
        Some(Signature::PlainText) => {
            // Already SiiNunit text
            Ok(working_data)
        }
        Some(Signature::Binary) => {
            // Decode BSII → SiiNunit
            let (version, blocks) = bsii_decoder::decode(&working_data)?;
            Ok(bsii_serializer::serialize_to_bytes(version, &blocks))
        }
        Some(Signature::ThreeNK) => {
            Err(SiiError::Other("3nK format is not yet supported".into()))
        }
        _ => Err(SiiError::UnknownSignature(inner_sig)),
    }
}
