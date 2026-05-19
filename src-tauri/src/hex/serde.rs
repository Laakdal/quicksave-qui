#![warn(missing_docs)]

use core::iter::FromIterator;

mod internal {
    use super::super::{
        decode::{hex_decode_with_case, CheckCase},
        encode::hex_encode_custom,
    };
    use core::iter::FromIterator;
    use std::{borrow::Cow, string::ToString};
    use serde::{
        de::{Error, IntoDeserializer},
        Deserializer, Serializer,
    };

    pub(crate) fn serialize<S, T>(
        data: T,
        serializer: S,
        with_prefix: bool,
        case: CheckCase,
    ) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: AsRef<[u8]>,
    {
        let src: &[u8] = data.as_ref();

        let mut dst_length = data.as_ref().len() << 1;
        if with_prefix {
            dst_length += 2;
        }

        let mut dst = vec![0u8; dst_length];
        let mut dst_start = 0;
        if with_prefix {
            dst[0] = b'0';
            dst[1] = b'x';

            dst_start = 2;
        }

        hex_encode_custom(src, &mut dst[dst_start..], matches!(case, CheckCase::Upper))
            .map_err(serde::ser::Error::custom)?;
        serializer.serialize_str(unsafe { ::core::str::from_utf8_unchecked(&dst) })
    }

    pub(crate) fn deserialize<'de, D, T>(
        deserializer: D,
        with_prefix: bool,
        check_case: CheckCase,
    ) -> Result<T, D::Error>
    where
        D: Deserializer<'de>,
        T: FromIterator<u8>,
    {
        let raw_src: Cow<str> = serde::Deserialize::deserialize(deserializer)?;
        if with_prefix && !raw_src.starts_with("0x") {
            return Err(D::Error::custom("invalid prefix".to_string()));
        }

        let src: &[u8] = {
            if with_prefix {
                raw_src[2..].as_bytes()
            } else {
                raw_src.as_bytes()
            }
        };

        if src.len() & 1 != 0 {
            return Err(D::Error::custom("invalid length".to_string()));
        }

        // we have already checked src's length, so src's length is a even integer
        let mut dst = vec![0; src.len() >> 1];
        hex_decode_with_case(src, &mut dst, check_case)
            .map_err(|e| Error::custom(format!("{:?}", e)))?;
        Ok(dst.into_iter().collect())
    }

    pub(crate) fn serialize_option<S, T>(
        option_data: &Option<T>,
        serializer: S,
        with_prefix: bool,
        case: CheckCase,
    ) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: AsRef<[u8]>,
    {
        match option_data {
            Some(data) => serialize(data, serializer, with_prefix, case),
            None => serializer.serialize_none(),
        }
    }

    pub(crate) fn deserialize_option<'de, D, T>(
        deserializer: D,
        with_prefix: bool,
        check_case: CheckCase,
    ) -> Result<Option<T>, D::Error>
    where
        D: Deserializer<'de>,
        T: FromIterator<u8>,
    {
        let option_str: Option<Cow<str>> = serde::Deserialize::deserialize(deserializer)?;
        match option_str {
            Some(raw_src) => {
                let des: Vec<u8> =
                    deserialize(raw_src.into_deserializer(), with_prefix, check_case)?;
                Ok(Some(des.into_iter().collect()))
            }
            None => Ok(None),
        }
    }
}

/// Serde: Serialize with 0x-prefix and ignore case
pub fn serialize<S, T>(data: T, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    T: AsRef<[u8]>,
{
    withpfx_ignorecase::serialize(data, serializer)
}

/// Serde: Deserialize with 0x-prefix and ignore case
pub fn deserialize<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: FromIterator<u8>,
{
    withpfx_ignorecase::deserialize(deserializer)
}

/// Generate module with serde methods
macro_rules! faster_hex_serde_macros {
    ($mod_name:ident, $with_pfx:expr, $check_case:expr) => {
        /// Serialize and deserialize with or without 0x-prefix,
        /// and lowercase or uppercase or ignorecase
        pub mod $mod_name {
            use super::super::decode::CheckCase;
            use super::internal;
            use core::iter::FromIterator;

            /// Serializes `data` as hex string
            pub fn serialize<S, T>(data: T, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: serde::Serializer,
                T: AsRef<[u8]>,
            {
                internal::serialize(data, serializer, $with_pfx, $check_case)
            }

            /// Deserializes a hex string into raw bytes.
            pub fn deserialize<'de, D, T>(deserializer: D) -> Result<T, D::Error>
            where
                D: serde::Deserializer<'de>,
                T: FromIterator<u8>,
            {
                internal::deserialize(deserializer, $with_pfx, $check_case)
            }
        }
    };
}

// /// Serialize with 0x-prefix and lowercase
// /// When deserialize, expect 0x-prefix and don't care case
faster_hex_serde_macros!(withpfx_ignorecase, true, CheckCase::None);
// /// Serialize without 0x-prefix and lowercase
// /// When deserialize, expect without 0x-prefix and don't care case
faster_hex_serde_macros!(nopfx_ignorecase, false, CheckCase::None);
// /// Serialize with 0x-prefix and lowercase
// /// When deserialize, expect with 0x-prefix and lower case
faster_hex_serde_macros!(withpfx_lowercase, true, CheckCase::Lower);
// /// Serialize without 0x-prefix and lowercase
// /// When deserialize, expect without 0x-prefix and lower case
faster_hex_serde_macros!(nopfx_lowercase, false, CheckCase::Lower);

// /// Serialize with 0x-prefix and upper case
// /// When deserialize, expect with 0x-prefix and upper case
faster_hex_serde_macros!(withpfx_uppercase, true, CheckCase::Upper);
// /// Serialize without 0x-prefix and upper case
// /// When deserialize, expect without 0x-prefix and upper case
faster_hex_serde_macros!(nopfx_uppercase, false, CheckCase::Upper);

/// Generate module with serde option methods
macro_rules! faster_hex_serde_option_macros {
    ($mod_name:ident, $with_pfx:expr, $check_case:expr) => {
        /// Serialize and deserialize with or without 0x-prefix,
        /// and lowercase or uppercase or ignorecase for Option<Vec<u8>>
        pub mod $mod_name {
            use super::super::decode::CheckCase;
            use super::internal;
            use core::iter::FromIterator;

            /// Serializes `Option<data>` as hex string or null
            pub fn serialize<S, T>(data: &Option<T>, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: serde::Serializer,
                T: AsRef<[u8]>,
            {
                internal::serialize_option(data, serializer, $with_pfx, $check_case)
            }

            /// Deserializes a hex string or null into `Option<Vec<u8>>`.
            pub fn deserialize<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
            where
                D: serde::Deserializer<'de>,
                T: FromIterator<u8>,
            {
                internal::deserialize_option(deserializer, $with_pfx, $check_case)
            }
        }
    };
}

// /// Serialize Option with 0x-prefix and ignorecase
faster_hex_serde_option_macros!(option_withpfx_ignorecase, true, CheckCase::None);
// /// Serialize Option without 0x-prefix and ignorecase
faster_hex_serde_option_macros!(option_nopfx_ignorecase, false, CheckCase::None);
// /// Serialize Option with 0x-prefix and lowercase
faster_hex_serde_option_macros!(option_withpfx_lowercase, true, CheckCase::Lower);
// /// Serialize Option without 0x-prefix and lowercase
faster_hex_serde_option_macros!(option_nopfx_lowercase, false, CheckCase::Lower);
// /// Serialize Option with 0x-prefix and uppercase
faster_hex_serde_option_macros!(option_withpfx_uppercase, true, CheckCase::Upper);
// /// Serialize Option without 0x-prefix and uppercase
faster_hex_serde_option_macros!(option_nopfx_uppercase, false, CheckCase::Upper);
