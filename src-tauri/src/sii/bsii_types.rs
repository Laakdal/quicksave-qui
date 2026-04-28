//! Data-type identifiers used in the BSII binary format.
//!
//! Each field in a BSII data block carries a `u32` type tag that tells the
//! decoder how to interpret the following bytes. This module defines those
//! tags and a sum type for decoded values.

use std::collections::HashMap;

/// BSII field type IDs (matches the C# `DataTypeIdFormat` enum).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u32)]
pub enum FieldType {
    Utf8String          = 0x01,
    Utf8StringArray     = 0x02,
    EncodedString       = 0x03,
    EncodedStringArray  = 0x04,
    F32                 = 0x05,
    F32Array            = 0x06,
    F32Vec2             = 0x07,
    F32Vec2Array        = 0x08,
    F32Vec3             = 0x09,
    F32Vec3Array        = 0x0A,
    I32Vec3             = 0x11,
    I32Vec3Array        = 0x12,
    F32Vec4             = 0x17,
    F32Vec4Array        = 0x18,
    Placement           = 0x19,  // 8 floats in v2/v3, 7 in v1
    PlacementArray      = 0x1A,
    I32                 = 0x25,
    I32Array            = 0x26,
    U32                 = 0x27,
    U32Array            = 0x28,
    I16                 = 0x29,
    I16Array            = 0x2A,
    U16                 = 0x2B,
    U16Array            = 0x2C,
    U32Alt              = 0x2F,  // Same encoding as U32
    I64                 = 0x31,
    I64Array            = 0x32,
    U64                 = 0x33,
    U64Array            = 0x34,
    Bool                = 0x35,
    BoolArray           = 0x36,
    OrdinalString       = 0x37,
    Id                  = 0x39,
    IdArrayA            = 0x3A,
    IdType2             = 0x3B,
    IdArrayC            = 0x3C,
    IdType3             = 0x3D,
    IdArrayE            = 0x3E,
}

impl FieldType {
    /// Try to convert a raw `u32` to a known field type.
    pub fn from_u32(v: u32) -> Option<Self> {
        match v {
            0x01 => Some(Self::Utf8String),
            0x02 => Some(Self::Utf8StringArray),
            0x03 => Some(Self::EncodedString),
            0x04 => Some(Self::EncodedStringArray),
            0x05 => Some(Self::F32),
            0x06 => Some(Self::F32Array),
            0x07 => Some(Self::F32Vec2),
            0x08 => Some(Self::F32Vec2Array),
            0x09 => Some(Self::F32Vec3),
            0x0A => Some(Self::F32Vec3Array),
            0x11 => Some(Self::I32Vec3),
            0x12 => Some(Self::I32Vec3Array),
            0x17 => Some(Self::F32Vec4),
            0x18 => Some(Self::F32Vec4Array),
            0x19 => Some(Self::Placement),
            0x1A => Some(Self::PlacementArray),
            0x25 => Some(Self::I32),
            0x26 => Some(Self::I32Array),
            0x27 => Some(Self::U32),
            0x28 => Some(Self::U32Array),
            0x29 => Some(Self::I16),
            0x2A => Some(Self::I16Array),
            0x2B => Some(Self::U16),
            0x2C => Some(Self::U16Array),
            0x2F => Some(Self::U32Alt),
            0x31 => Some(Self::I64),
            0x32 => Some(Self::I64Array),
            0x33 => Some(Self::U64),
            0x34 => Some(Self::U64Array),
            0x35 => Some(Self::Bool),
            0x36 => Some(Self::BoolArray),
            0x37 => Some(Self::OrdinalString),
            0x39 => Some(Self::Id),
            0x3A => Some(Self::IdArrayA),
            0x3B => Some(Self::IdType2),
            0x3C => Some(Self::IdArrayC),
            0x3D => Some(Self::IdType3),
            0x3E => Some(Self::IdArrayE),
            _ => None,
        }
    }
}

/// A decoded field value.  This replaces the C# `dynamic Value` with an
/// explicit enum so we get type safety without boxing.
#[derive(Debug, Clone)]
pub enum FieldValue {
    Bool(bool),
    BoolArray(Vec<bool>),
    I16(i16),
    I16Array(Vec<i16>),
    U16(u16),
    U16Array(Vec<u16>),
    I32(i32),
    I32Array(Vec<i32>),
    U32(u32),
    U32Array(Vec<u32>),
    I64(i64),
    I64Array(Vec<i64>),
    U64(u64),
    U64Array(Vec<u64>),
    F32(f32),
    F32Array(Vec<f32>),
    F32Vec2([f32; 2]),
    F32Vec2Array(Vec<[f32; 2]>),
    F32Vec3([f32; 3]),
    F32Vec3Array(Vec<[f32; 3]>),
    I32Vec3([i32; 3]),
    I32Vec3Array(Vec<[i32; 3]>),
    F32Vec4([f32; 4]),
    F32Vec4Array(Vec<[f32; 4]>),
    PlacementV1([f32; 7]),
    PlacementV1Array(Vec<[f32; 7]>),
    PlacementV2([f32; 8]),
    PlacementV2Array(Vec<[f32; 8]>),
    Str(String),
    StrArray(Vec<String>),
    Id(String),
    IdArray(Vec<String>),
    OrdinalTable(HashMap<u32, String>),
    OrdinalValue(String),
    /// Sentinel — the type-0 end-of-block marker.
    EndMarker,
}

/// A single decoded field inside a data block.
#[derive(Debug, Clone)]
pub struct Field {
    pub name: String,
    pub type_id: u32,
    pub value: FieldValue,
}

/// A structure block prototype (type == 0 entry, defines the "class").
#[derive(Debug, Clone)]
pub struct BlockPrototype {
    pub structure_id: u32,
    pub name: String,
    /// Field definitions — for most fields this just stores the name + type;
    /// for `OrdinalString` fields it also stores the enum table.
    pub fields: Vec<Field>,
}

/// A decoded data block instance.
#[derive(Debug, Clone)]
pub struct DataBlock {
    pub structure_id: u32,
    pub name: String,
    /// The ID line (e.g. `my_truck.trailer.0`).
    pub id: String,
    pub fields: Vec<Field>,
}
