//! Serialises decoded BSII data blocks into the human-readable SiiNunit text
//! format.
//!
//! Uses [`ropey::Rope`] as the backing buffer so that even 180 000+ line save
//! files stay efficient — insertions and appends are O(log n) instead of the
//! O(n) you would get with a flat `String`.

use ropey::Rope;

use crate::sii::bsii_types::*;

/// Characters that do NOT require quoting when they appear in a UTF-8 string
/// value.  If every character of a string belongs to this set, it is written
/// bare; otherwise it is wrapped in double quotes.
const UNQUOTED_CHARS: &[u8] = b"0123456789\
abcdefghijklmnopqrstuvwxyz\
ABCDEFGHIJKLMNOPQRSTUVWXYZ_";

/// Serialise a set of decoded data blocks into the SiiNunit text format,
/// returning the result as a `ropey::Rope`.
pub fn serialize(version: u32, blocks: &[DataBlock]) -> Rope {
    let mut rope = Rope::new();
    rope.append(Rope::from_str("SiiNunit\n"));
    rope.append(Rope::from_str("{\n"));

    for block in blocks {
        if block.name.is_empty() || block.id.is_empty() {
            continue;
        }

        // Block header
        let header = format!("{} : {} {{\n", block.name, block.id);
        rope.append(Rope::from_str(&header));

        for field in &block.fields {
            if field.type_id == 0 {
                continue;
            }
            let line = serialize_field(field);
            rope.append(Rope::from_str(&line));
        }

        rope.append(Rope::from_str("}\n\n"));
    }

    rope.append(Rope::from_str("}"));
    rope
}

/// Convenience wrapper that returns a UTF-8 byte vector.
pub fn serialize_to_bytes(version: u32, blocks: &[DataBlock]) -> Vec<u8> {
    let rope = serialize(version, blocks);
    let mut buf = Vec::with_capacity(rope.len_bytes());
    for chunk in rope.chunks() {
        buf.extend_from_slice(chunk.as_bytes());
    }
    buf
}

// ── Per-field serialisation ──────────────────────────────────────────────

fn serialize_field(field: &Field) -> String {
    let name = &field.name;
    match &field.value {
        // Scalars
        FieldValue::Bool(v) => format!(" {name}: {}\n", if *v { "true" } else { "false" }),
        FieldValue::I16(v) => format!(" {name}: {}\n", fmt_i16(*v)),
        FieldValue::U16(v) => format!(" {name}: {}\n", fmt_u16(*v)),
        FieldValue::I32(v) => format!(" {name}: {}\n", fmt_i32(*v)),
        FieldValue::U32(v) => format!(" {name}: {}\n", fmt_u32(*v)),
        FieldValue::I64(v) => format!(" {name}: {}\n", fmt_i64(*v)),
        FieldValue::U64(v) => format!(" {name}: {}\n", fmt_u64(*v)),
        FieldValue::F32(v) => format!(" {name}: {}\n", fmt_f32(*v)),

        // Vectors
        FieldValue::F32Vec2(v) => {
            format!(" {name}: ({}, {})\n", fmt_f32(v[0]), fmt_f32(v[1]))
        }
        FieldValue::F32Vec3(v) => {
            format!(" {name}: ({}, {}, {})\n", fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]))
        }
        FieldValue::I32Vec3(v) => {
            format!(" {name}: ({}, {}, {})\n", fmt_f32(v[0] as f32), fmt_f32(v[1] as f32), fmt_f32(v[2] as f32))
        }
        FieldValue::F32Vec4(v) => {
            format!(" {name}: ({}; {}, {}, {})\n",
                fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]), fmt_f32(v[3]))
        }

        // Placements
        FieldValue::PlacementV1(v) => {
            format!(" {name}: ({}, {}, {}) ({}; {}, {})\n",
                fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]),
                fmt_f32(v[3]), fmt_f32(v[4]), fmt_f32(v[5]))
        }
        FieldValue::PlacementV2(v) => {
            format!(" {name}: ({}, {}, {}) ({}; {}, {}, {})\n",
                fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]),
                fmt_f32(v[4]), fmt_f32(v[5]), fmt_f32(v[6]), fmt_f32(v[7]))
        }

        // Strings
        FieldValue::Str(v) => format!(" {name}: {}\n", fmt_string(v)),
        FieldValue::Id(v) => format!(" {name}: {v}\n"),
        FieldValue::OrdinalValue(v) => format!(" {name}: {v}\n"),

        // ── Arrays ───────────────────────────────────────────────────
        FieldValue::BoolArray(arr) => fmt_array(name, arr, |v| {
            if *v { "true".to_string() } else { "false".to_string() }
        }),
        FieldValue::I16Array(arr) => fmt_array(name, arr, |v| fmt_i16(*v)),
        FieldValue::U16Array(arr) => fmt_array(name, arr, |v| fmt_u16(*v)),
        FieldValue::I32Array(arr) => fmt_array(name, arr, |v| fmt_i32(*v)),
        FieldValue::U32Array(arr) => fmt_array(name, arr, |v| fmt_u32(*v)),
        FieldValue::I64Array(arr) => fmt_array(name, arr, |v| fmt_i64(*v)),
        FieldValue::U64Array(arr) => fmt_array(name, arr, |v| fmt_u64(*v)),
        FieldValue::F32Array(arr) => fmt_array(name, arr, |v| fmt_f32(*v)),

        FieldValue::StrArray(arr) => fmt_array(name, arr, |v| fmt_string(v)),
        FieldValue::IdArray(arr)  => fmt_array(name, arr, |v| v.clone()),

        FieldValue::F32Vec2Array(arr) => fmt_array(name, arr, |v| {
            format!("({}, {})", fmt_f32(v[0]), fmt_f32(v[1]))
        }),
        FieldValue::F32Vec3Array(arr) => fmt_array(name, arr, |v| {
            format!("({}, {}, {})", fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]))
        }),
        FieldValue::I32Vec3Array(arr) => fmt_array(name, arr, |v| {
            format!("({}, {}, {})", fmt_f32(v[0] as f32), fmt_f32(v[1] as f32), fmt_f32(v[2] as f32))
        }),
        FieldValue::F32Vec4Array(arr) => fmt_array(name, arr, |v| {
            format!("({}; {}, {}, {})", fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]), fmt_f32(v[3]))
        }),
        FieldValue::PlacementV1Array(arr) => fmt_array(name, arr, |v| {
            format!("({}, {}, {}) ({}; {}, {})",
                fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]),
                fmt_f32(v[3]), fmt_f32(v[4]), fmt_f32(v[5]))
        }),
        FieldValue::PlacementV2Array(arr) => fmt_array(name, arr, |v| {
            format!("({}, {}, {}) ({}; {}, {}, {})",
                fmt_f32(v[0]), fmt_f32(v[1]), fmt_f32(v[2]),
                fmt_f32(v[4]), fmt_f32(v[5]), fmt_f32(v[6]), fmt_f32(v[7]))
        }),

        // Should not appear during serialisation
        FieldValue::OrdinalTable(_) | FieldValue::EndMarker => String::new(),
    }
}

// ── Formatting helpers ──────────────────────────────────────────────────

/// Format an array field:
/// ```text
///  field_name: <count>
///  field_name[0]: <value>
///  field_name[1]: <value>
///  ...
/// ```
fn fmt_array<T, F: Fn(&T) -> String>(name: &str, items: &[T], formatter: F) -> String {
    let mut out = format!(" {name}: {}\n", items.len());
    for (i, item) in items.iter().enumerate() {
        out.push_str(&format!(" {name}[{i}]: {}\n", formatter(item)));
    }
    out
}

/// Format an `f32` the same way the C# code does:
/// - If the value has no fractional part **and** is < 1e7, write as integer.
/// - Otherwise write the raw IEEE-754 hex representation prefixed with `&`.
fn fmt_f32(v: f32) -> String {
    if v.fract() == 0.0 && v.abs() < 1e7 {
        format!("{}", v as i32)
    } else {
        let bytes = v.to_le_bytes();
        format!("&{:02x}{:02x}{:02x}{:02x}", bytes[3], bytes[2], bytes[1], bytes[0])
    }
}

fn fmt_i16(v: i16) -> String {
    if v == i16::MAX { "nil".to_string() } else { v.to_string() }
}

fn fmt_u16(v: u16) -> String {
    if v == u16::MAX { "nil".to_string() } else { v.to_string() }
}

fn fmt_i32(v: i32) -> String {
    v.to_string()
}

fn fmt_u32(v: u32) -> String {
    if v == u32::MAX { "nil".to_string() } else { v.to_string() }
}

fn fmt_i64(v: i64) -> String {
    v.to_string()
}

fn fmt_u64(v: u64) -> String {
    v.to_string()
}

/// Format a UTF-8 string value.  If the string is empty, return `""`.
/// If it is purely alphanumeric + underscore, write it bare.
/// Otherwise wrap in double quotes.
fn fmt_string(s: &str) -> String {
    if s.is_empty() {
        return "\"\"".to_string();
    }
    // If it parses as an integer, write bare (matches C# behaviour).
    if s.parse::<i64>().is_ok() {
        return s.to_string();
    }
    if is_limited_alphabet(s) {
        s.to_string()
    } else {
        format!("\"{s}\"")
    }
}

fn is_limited_alphabet(s: &str) -> bool {
    s.bytes().all(|b| UNQUOTED_CHARS.contains(&b))
}
