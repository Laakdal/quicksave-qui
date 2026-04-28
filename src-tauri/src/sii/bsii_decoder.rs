//! BSII binary decoder.
//!
//! Converts a raw BSII byte buffer into a list of [`DataBlock`]s that can
//! then be serialised to the SiiNunit text format.

use std::collections::HashMap;

use crate::sii::bsii_types::*;
use crate::sii::error::{SiiError, SiiResult};
use crate::sii::reader::BinaryReader;

/// Supported BSII format versions.
const SUPPORTED_VERSIONS: [u32; 3] = [1, 2, 3];

/// Decode a BSII byte buffer into structured data blocks.
///
/// The caller is expected to have already verified the 4-byte `BSII` signature;
/// the buffer passed here should still include those first 4 bytes (they are
/// re-read for validation).
pub fn decode(data: &[u8]) -> SiiResult<(u32, Vec<DataBlock>)> {
    let mut r = BinaryReader::new(data);

    // Header
    let _signature = r.read_u32()?; // BSII magic — already verified by caller
    let version = r.read_u32()?;

    if !SUPPORTED_VERSIONS.contains(&version) {
        return Err(SiiError::UnsupportedVersion(version));
    }

    // Phase 1: read prototypes (blockType == 0) and data instances (blockType != 0).
    let mut prototypes: HashMap<u32, BlockPrototype> = HashMap::new();
    let mut ordinal_tables: HashMap<u32, HashMap<u32, String>> = HashMap::new();
    let mut decoded_blocks: Vec<DataBlock> = Vec::new();

    while !r.is_eof() {
        let block_type = r.read_u32()?;

        if block_type == 0 {
            // ── Prototype definition ─────────────────────────────────
            let validity = r.read_bool()?;
            if !validity {
                // Invalid prototype — skip
                continue;
            }

            let structure_id = r.read_u32()?;
            let name = r.read_utf8_string()?;

            let mut fields: Vec<Field> = Vec::new();
            loop {
                let field = read_prototype_field(&mut r)?;
                let is_end = field.type_id == 0;

                // If it's an ordinal table, stash it for later lookups.
                if let FieldValue::OrdinalTable(ref table) = field.value {
                    ordinal_tables.entry(structure_id).or_insert_with(|| table.clone());
                }

                fields.push(field);
                if is_end {
                    break;
                }
            }

            prototypes.entry(structure_id).or_insert(BlockPrototype {
                structure_id,
                name,
                fields,
            });
        } else {
            // ── Data instance ────────────────────────────────────────
            let proto = prototypes.get(&block_type).ok_or_else(|| {
                SiiError::Other(format!("no prototype for structure_id {block_type}"))
            })?;
            let ordinals = ordinal_tables.get(&block_type);
            let empty = HashMap::new();
            let ord = ordinals.unwrap_or(&empty);

            let block = decode_data_block(&mut r, proto, version, ord)?;
            decoded_blocks.push(block);
        }
    }

    Ok((version, decoded_blocks))
}

/// Read one field definition from a prototype block.
fn read_prototype_field(r: &mut BinaryReader<'_>) -> SiiResult<Field> {
    let type_id = r.read_u32()?;
    if type_id == 0 {
        return Ok(Field {
            name: String::new(),
            type_id: 0,
            value: FieldValue::EndMarker,
        });
    }
    let name = r.read_utf8_string()?;
    let value = if type_id == FieldType::OrdinalString as u32 {
        FieldValue::OrdinalTable(r.read_ordinal_string_table()?)
    } else {
        FieldValue::EndMarker // placeholder; actual value decoded per-instance
    };

    Ok(Field {
        name,
        type_id,
        value,
    })
}

/// Decode one data-block instance using its prototype as a template.
fn decode_data_block(
    r: &mut BinaryReader<'_>,
    proto: &BlockPrototype,
    version: u32,
    ordinals: &HashMap<u32, String>,
) -> SiiResult<DataBlock> {
    let id = r.read_id()?;

    let mut fields = Vec::with_capacity(proto.fields.len());

    for proto_field in &proto.fields {
        if proto_field.type_id == 0 {
            continue; // end-marker
        }

        let value = decode_field_value(r, proto_field.type_id, version, ordinals)?;
        fields.push(Field {
            name: proto_field.name.clone(),
            type_id: proto_field.type_id,
            value,
        });
    }

    Ok(DataBlock {
        structure_id: proto.structure_id,
        name: proto.name.clone(),
        id,
        fields,
    })
}

/// Decode a single field value based on its type ID.
fn decode_field_value(
    r: &mut BinaryReader<'_>,
    type_id: u32,
    version: u32,
    ordinals: &HashMap<u32, String>,
) -> SiiResult<FieldValue> {
    let ft = FieldType::from_u32(type_id);

    match ft {
        Some(FieldType::Bool)              => Ok(FieldValue::Bool(r.read_bool()?)),
        Some(FieldType::BoolArray)         => Ok(FieldValue::BoolArray(r.read_bool_array()?)),
        Some(FieldType::I16)               => Ok(FieldValue::I16(r.read_i16()?)),
        Some(FieldType::I16Array)          => Ok(FieldValue::I16Array(r.read_i16_array()?)),
        Some(FieldType::U16)               => Ok(FieldValue::U16(r.read_u16()?)),
        Some(FieldType::U16Array)          => Ok(FieldValue::U16Array(r.read_u16_array()?)),
        Some(FieldType::I32)               => Ok(FieldValue::I32(r.read_i32()?)),
        Some(FieldType::I32Array)          => Ok(FieldValue::I32Array(r.read_i32_array()?)),
        Some(FieldType::U32 | FieldType::U32Alt) => Ok(FieldValue::U32(r.read_u32()?)),
        Some(FieldType::U32Array)          => Ok(FieldValue::U32Array(r.read_u32_array()?)),
        Some(FieldType::I64)               => Ok(FieldValue::I64(r.read_i64()?)),
        Some(FieldType::I64Array)          => Ok(FieldValue::I64Array(r.read_i64_array()?)),
        Some(FieldType::U64)               => Ok(FieldValue::U64(r.read_u64()?)),
        Some(FieldType::U64Array)          => Ok(FieldValue::U64Array(r.read_u64_array()?)),
        Some(FieldType::F32)               => Ok(FieldValue::F32(r.read_f32()?)),
        Some(FieldType::F32Array)          => Ok(FieldValue::F32Array(r.read_f32_array()?)),
        Some(FieldType::F32Vec2)           => Ok(FieldValue::F32Vec2(r.read_f32_vec2()?)),
        Some(FieldType::F32Vec2Array)      => Ok(FieldValue::F32Vec2Array(r.read_f32_vec2_array()?)),
        Some(FieldType::F32Vec3)           => Ok(FieldValue::F32Vec3(r.read_f32_vec3()?)),
        Some(FieldType::F32Vec3Array)      => Ok(FieldValue::F32Vec3Array(r.read_f32_vec3_array()?)),
        Some(FieldType::I32Vec3)           => Ok(FieldValue::I32Vec3(r.read_i32_vec3()?)),
        Some(FieldType::I32Vec3Array)      => Ok(FieldValue::I32Vec3Array(r.read_i32_vec3_array()?)),
        Some(FieldType::F32Vec4)           => Ok(FieldValue::F32Vec4(r.read_f32_vec4()?)),
        Some(FieldType::F32Vec4Array)      => Ok(FieldValue::F32Vec4Array(r.read_f32_vec4_array()?)),

        Some(FieldType::Placement) => {
            if version == 1 {
                Ok(FieldValue::PlacementV1(r.read_placement_v1()?))
            } else {
                Ok(FieldValue::PlacementV2(r.read_placement_v2()?))
            }
        }
        Some(FieldType::PlacementArray) => {
            if version == 1 {
                Ok(FieldValue::PlacementV1Array(r.read_placement_v1_array()?))
            } else {
                Ok(FieldValue::PlacementV2Array(r.read_placement_v2_array()?))
            }
        }

        Some(FieldType::Utf8String)        => Ok(FieldValue::Str(r.read_utf8_string()?)),
        Some(FieldType::Utf8StringArray)   => Ok(FieldValue::StrArray(r.read_utf8_string_array()?)),
        Some(FieldType::EncodedString)     => Ok(FieldValue::Str(r.read_encoded_string()?)),
        Some(FieldType::EncodedStringArray)=> Ok(FieldValue::StrArray(r.read_encoded_string_array()?)),

        Some(FieldType::Id | FieldType::IdType2 | FieldType::IdType3) => {
            Ok(FieldValue::Id(r.read_id()?))
        }
        Some(FieldType::IdArrayA | FieldType::IdArrayC | FieldType::IdArrayE) => {
            Ok(FieldValue::IdArray(r.read_id_array()?))
        }

        Some(FieldType::OrdinalString) => {
            Ok(FieldValue::OrdinalValue(r.read_ordinal_value(ordinals)?))
        }

        None => {
            // Unknown type — log and skip (we can't know how many bytes to
            // consume, so this is effectively fatal).
            Err(SiiError::Other(format!("unknown BSII field type: 0x{type_id:02X}")))
        }
    }
}
