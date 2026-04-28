//! A zero-copy binary cursor for reading SII binary data.
//!
//! Replaces the C# `StreamUtils` + the primitive decoders in `BSII_Type_Decoder`.
//! All multi-byte integers are little-endian, matching the SII on-disk format.

use crate::sii::error::{SiiError, SiiResult};
use std::collections::HashMap;

/// Lookup table for decoding encoded strings (base-38 encoding).
const CHAR_TABLE: [char; 37] = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', '_',
];

/// A cursor that walks forward through a `&[u8]` slice, reading typed values.
pub struct BinaryReader<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> BinaryReader<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }

    /// Current byte offset.
    #[inline]
    pub fn position(&self) -> usize {
        self.pos
    }

    /// Total length of the underlying slice.
    #[inline]
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Whether we have consumed everything.
    #[inline]
    pub fn is_eof(&self) -> bool {
        self.pos >= self.data.len()
    }

    /// Remaining bytes.
    #[inline]
    pub fn remaining(&self) -> usize {
        self.data.len().saturating_sub(self.pos)
    }

    // ── Primitives ───────────────────────────────────────────────────

    fn read_bytes(&mut self, n: usize) -> SiiResult<&'a [u8]> {
        if self.pos + n > self.data.len() {
            return Err(SiiError::UnexpectedEof);
        }
        let slice = &self.data[self.pos..self.pos + n];
        self.pos += n;
        Ok(slice)
    }

    pub fn read_u8(&mut self) -> SiiResult<u8> {
        let b = self.read_bytes(1)?;
        Ok(b[0])
    }

    pub fn read_bool(&mut self) -> SiiResult<bool> {
        Ok(self.read_u8()? != 0)
    }

    pub fn read_i16(&mut self) -> SiiResult<i16> {
        let b = self.read_bytes(2)?;
        Ok(i16::from_le_bytes([b[0], b[1]]))
    }

    pub fn read_u16(&mut self) -> SiiResult<u16> {
        let b = self.read_bytes(2)?;
        Ok(u16::from_le_bytes([b[0], b[1]]))
    }

    pub fn read_i32(&mut self) -> SiiResult<i32> {
        let b = self.read_bytes(4)?;
        Ok(i32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    pub fn read_u32(&mut self) -> SiiResult<u32> {
        let b = self.read_bytes(4)?;
        Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    pub fn read_i64(&mut self) -> SiiResult<i64> {
        let b = self.read_bytes(8)?;
        Ok(i64::from_le_bytes(b.try_into().unwrap()))
    }

    pub fn read_u64(&mut self) -> SiiResult<u64> {
        let b = self.read_bytes(8)?;
        Ok(u64::from_le_bytes(b.try_into().unwrap()))
    }

    pub fn read_f32(&mut self) -> SiiResult<f32> {
        let b = self.read_bytes(4)?;
        Ok(f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    // ── Strings ──────────────────────────────────────────────────────

    /// 0x01 — length-prefixed UTF-8 string.
    pub fn read_utf8_string(&mut self) -> SiiResult<String> {
        let len = self.read_u32()? as usize;
        let bytes = self.read_bytes(len)?;
        String::from_utf8(bytes.to_vec()).map_err(SiiError::InvalidUtf8)
    }

    /// 0x02 — array of length-prefixed UTF-8 strings.
    pub fn read_utf8_string_array(&mut self) -> SiiResult<Vec<String>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_utf8_string()).collect()
    }

    /// 0x03 — string encoded as a base-38 packed u64.
    pub fn read_encoded_string(&mut self) -> SiiResult<String> {
        let mut value = self.read_u64()?;
        let mut result = String::new();
        while value != 0 {
            let mut char_idx = (value % 38) as i64 - 1;
            if char_idx < 0 {
                char_idx = -char_idx;
            }
            value /= 38;
            if char_idx >= 0 && (char_idx as usize) < CHAR_TABLE.len() {
                result.push(CHAR_TABLE[char_idx as usize]);
            }
        }
        Ok(result)
    }

    /// 0x04 — array of encoded strings.
    pub fn read_encoded_string_array(&mut self) -> SiiResult<Vec<String>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_encoded_string()).collect()
    }

    // ── Scalar arrays ────────────────────────────────────────────────

    pub fn read_bool_array(&mut self) -> SiiResult<Vec<bool>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_bool()).collect()
    }

    pub fn read_f32_array(&mut self) -> SiiResult<Vec<f32>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_f32()).collect()
    }

    pub fn read_i16_array(&mut self) -> SiiResult<Vec<i16>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_i16()).collect()
    }

    pub fn read_u16_array(&mut self) -> SiiResult<Vec<u16>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_u16()).collect()
    }

    pub fn read_i32_array(&mut self) -> SiiResult<Vec<i32>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_i32()).collect()
    }

    pub fn read_u32_array(&mut self) -> SiiResult<Vec<u32>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_u32()).collect()
    }

    pub fn read_i64_array(&mut self) -> SiiResult<Vec<i64>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_i64()).collect()
    }

    pub fn read_u64_array(&mut self) -> SiiResult<Vec<u64>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_u64()).collect()
    }

    // ── Vectors (tuples of f32 / i32) ────────────────────────────────

    pub fn read_f32_vec2(&mut self) -> SiiResult<[f32; 2]> {
        Ok([self.read_f32()?, self.read_f32()?])
    }

    pub fn read_f32_vec2_array(&mut self) -> SiiResult<Vec<[f32; 2]>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_f32_vec2()).collect()
    }

    pub fn read_f32_vec3(&mut self) -> SiiResult<[f32; 3]> {
        Ok([self.read_f32()?, self.read_f32()?, self.read_f32()?])
    }

    pub fn read_f32_vec3_array(&mut self) -> SiiResult<Vec<[f32; 3]>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_f32_vec3()).collect()
    }

    pub fn read_i32_vec3(&mut self) -> SiiResult<[i32; 3]> {
        Ok([self.read_i32()?, self.read_i32()?, self.read_i32()?])
    }

    pub fn read_i32_vec3_array(&mut self) -> SiiResult<Vec<[i32; 3]>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_i32_vec3()).collect()
    }

    pub fn read_f32_vec4(&mut self) -> SiiResult<[f32; 4]> {
        Ok([
            self.read_f32()?,
            self.read_f32()?,
            self.read_f32()?,
            self.read_f32()?,
        ])
    }

    pub fn read_f32_vec4_array(&mut self) -> SiiResult<Vec<[f32; 4]>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_f32_vec4()).collect()
    }

    /// Read 6 floats (placement format v1 — position + quaternion without high-precision bias).
    pub fn read_placement_v1(&mut self) -> SiiResult<[f32; 7]> {
        Ok([
            self.read_f32()?,
            self.read_f32()?,
            self.read_f32()?,
            self.read_f32()?,
            self.read_f32()?,
            self.read_f32()?,
            0.0, // unused slot for uniformity
        ])
    }

    pub fn read_placement_v1_array(&mut self) -> SiiResult<Vec<[f32; 7]>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_placement_v1()).collect()
    }

    /// Read 8 floats (placement format v2/v3 — with high-precision bias in `d`).
    ///
    /// The 4th float (`d`) encodes extra precision for `a` and `c`:
    ///   bits  [0..12)  → bias for a  (subtract 2048, shift left 9)
    ///   bits [12..24)  → bias for c  (subtract 2048, shift left 9)
    pub fn read_placement_v2(&mut self) -> SiiResult<[f32; 8]> {
        let mut v = [0f32; 8];
        for slot in &mut v {
            *slot = self.read_f32()?;
        }
        // Apply high-precision bias from d (v[3])
        let bias = v[3] as i64;

        let bits_a = ((bias & 0xFFF) - 2048) << 9;
        v[0] += bits_a as f32;

        let bits_c = (((bias >> 12) & 0xFFF) - 2048) << 9;
        v[2] += bits_c as f32;

        Ok(v)
    }

    pub fn read_placement_v2_array(&mut self) -> SiiResult<Vec<[f32; 8]>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_placement_v2()).collect()
    }

    // ── ID complex type (0x39, 0x3B, 0x3D) ──────────────────────────

    /// Decode an ID value.  The first byte is a "part count":
    /// - `0xFF` → nameless pointer (raw u64 formatted as hex dot-groups)
    /// - `0`    → `"null"`
    /// - `n`    → `n` base-38 encoded parts joined by `.`
    pub fn read_id(&mut self) -> SiiResult<String> {
        let part_count = self.read_u8()?;

        if part_count == 0xFF {
            // Nameless encoded pointer
            let addr = self.read_u64()?;
            let bytes = addr.to_le_bytes();
            let mut parts: Vec<String> = Vec::new();
            let mut current = String::new();

            for (i, &b) in bytes.iter().enumerate() {
                if i % 2 == 0 && i > 0 {
                    // For the last group, strip leading zeros
                    if i >= bytes.len() - 2 {
                        current = current.trim_start_matches('0').to_string();
                    }
                    if !current.is_empty() {
                        parts.push(current.clone());
                    }
                    current.clear();
                }
                current = format!("{b:02x}{current}");
                if i == bytes.len() - 1 {
                    current = current.trim_start_matches('0').to_string();
                    if !current.is_empty() {
                        parts.push(current.clone());
                    }
                }
            }

            parts.reverse();
            Ok(format!("_nameless.{}", parts.join(".")))
        } else if part_count == 0 {
            Ok("null".to_string())
        } else {
            let mut result = String::new();
            for i in 0..part_count {
                let s = self.read_encoded_string()?;
                if i > 0 {
                    result.push('.');
                }
                result.push_str(&s);
            }
            Ok(result)
        }
    }

    /// 0x3A, 0x3C, 0x3E — array of IDs.
    pub fn read_id_array(&mut self) -> SiiResult<Vec<String>> {
        let count = self.read_u32()? as usize;
        (0..count).map(|_| self.read_id()).collect()
    }

    // ── Ordinal / enum strings (0x37) ────────────────────────────────

    /// Read an ordinal-string table: `{ ordinal → name }`.
    pub fn read_ordinal_string_table(&mut self) -> SiiResult<HashMap<u32, String>> {
        let count = self.read_u32()? as usize;
        let mut map = HashMap::with_capacity(count);
        for _ in 0..count {
            let ordinal = self.read_u32()?;
            let name = self.read_utf8_string()?;
            map.insert(ordinal, name);
        }
        Ok(map)
    }

    /// Look up an ordinal value in a previously-decoded table.
    pub fn read_ordinal_value(&mut self, table: &HashMap<u32, String>) -> SiiResult<String> {
        let index = self.read_u32()?;
        Ok(table.get(&index).cloned().unwrap_or_default())
    }
}
