//! AES-CBC decryption and zlib decompression for encrypted SII files (ScsC).
//!
//! The on-disk layout after the initial 4-byte `ScsC` signature:
//!
//! | Offset | Size   | Field                       |
//! |--------|--------|-----------------------------|
//! | 0      | 4      | HMAC signature (u32)        |
//! | 4      | 32     | HMAC (unused here)          |
//! | 36     | 16     | AES-CBC IV                  |
//! | 52     | 4      | Uncompressed data size (u32)|
//! | 56     | …      | AES-CBC ciphertext          |
//!
//! **Note:** The original C# code uses `Aes.Create()` which defaults to
//! **AES-256-CBC** with PKCS7 padding — *not* AES-GCM. This Rust port uses
//! `cbc` + `aes` crates to stay compatible with actual SII files.

use crate::sii::error::{SiiError, SiiResult};

use aes::cipher::{BlockDecryptMut, KeyIvInit, block_padding::Pkcs7};

type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

/// The hard-coded AES-256 key used by SCS games.
const SII_KEY: [u8; 32] = [
    0x2a, 0x5f, 0xcb, 0x17, 0x91, 0xd2, 0x2f, 0xb6,
    0x02, 0x45, 0xb3, 0xd8, 0x36, 0x9e, 0xd0, 0xb2,
    0xc2, 0x73, 0x71, 0x56, 0x3f, 0xbf, 0x1f, 0x3c,
    0x9e, 0xdf, 0x6b, 0x11, 0x82, 0x5a, 0x5d, 0x0a,
];

/// Decrypt and decompress an ScsC-encrypted SII buffer.
///
/// `data` should begin **after** the initial 4-byte `ScsC` signature (i.e.
/// starting at the HMAC signature field).
///
/// Returns the raw decompressed bytes (which will start with either the `BSII`
/// or `SiiN` signature).
pub fn decrypt_scsc(data: &[u8]) -> SiiResult<Vec<u8>> {
    if data.len() < 56 {
        return Err(SiiError::UnexpectedEof);
    }

    // Parse the header fields (the 4-byte ScsC signature is already stripped)
    // let _hmac     = &data[0..32];  // not verified
    let iv = &data[32..48];
    let data_size = u32::from_le_bytes([data[48], data[49], data[50], data[51]]) as usize;
    let ciphertext = &data[52..];

    // Decrypt (AES-256-CBC, PKCS7 padding)
    let mut buf = ciphertext.to_vec();
    let decrypted = Aes256CbcDec::new_from_slices(&SII_KEY, iv)
        .map_err(|e| SiiError::DecryptionFailed(e.to_string()))?
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|e| SiiError::DecryptionFailed(e.to_string()))?;

    // Decompress (zlib)
    let mut decompressed = vec![0u8; data_size];
    let mut decompressor = flate2::Decompress::new(true); // zlib header
    decompressor
        .decompress(decrypted, &mut decompressed, flate2::FlushDecompress::Finish)
        .map_err(|e| SiiError::DecompressionFailed(e.to_string()))?;

    Ok(decompressed)
}
