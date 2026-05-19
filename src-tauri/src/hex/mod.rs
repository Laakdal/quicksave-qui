pub mod decode;
pub mod encode;
pub mod error;
#[allow(missing_docs)]
pub mod serde;

pub use decode::{
    hex_check, hex_check_fallback, hex_check_with_case, hex_decode, hex_decode_fallback,
    hex_decode_unchecked,
};
pub use encode::{
    hex_encode, hex_encode_fallback, hex_encode_upper, hex_encode_upper_fallback, hex_string,
    hex_string_upper,
};
pub use error::Error;

pub fn decode_f32_hex(value: &str) -> Result<f32, Error> {
    let bytes = value.as_bytes();

    if bytes.len() != 8 {
        return Err(Error::InvalidLength(bytes.len()));
    }

    if !hex_check(bytes) {
        return Err(Error::InvalidChar);
    }

    let bits = u32::from_str_radix(value, 16).map_err(|_| Error::InvalidChar)?;
    Ok(f32::from_bits(bits))
}

#[allow(deprecated)]
pub use encode::hex_to;

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
pub use decode::{hex_check_sse, hex_check_sse_with_case};

#[cfg(target_arch = "aarch64")]
pub use decode::{hex_check_neon, hex_check_neon_with_case};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_single_precision_hex() {
        let value = decode_f32_hex("3dcb4eb1").unwrap();

        assert!((value - 0.099271).abs() < 0.000001);
    }

    #[test]
    fn rejects_non_u32_hex_length() {
        assert!(matches!(decode_f32_hex("3dcb4eb"), Err(Error::InvalidLength(7))));
    }

    #[test]
    fn rejects_invalid_hex_chars() {
        assert!(matches!(decode_f32_hex("3dcb4ex1"), Err(Error::InvalidChar)));
    }
}

#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub(crate) enum Vectorization {
    None = 0,
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    SSE41 = 1,
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    AVX2 = 2,
    #[cfg(target_arch = "aarch64")]
    Neon = 3,
}

#[inline(always)]
pub(crate) fn vectorization_support() -> Vectorization {
    #[cfg(all(
        any(target_arch = "x86", target_arch = "x86_64"),
        target_feature = "sse"
    ))]
    {
        use core::sync::atomic::{AtomicU8, Ordering};
        static FLAGS: AtomicU8 = AtomicU8::new(u8::MAX);

        let current_flags = FLAGS.load(Ordering::Relaxed);
        if current_flags != u8::MAX {
            return match current_flags {
                0 => Vectorization::None,
                1 => Vectorization::SSE41,
                2 => Vectorization::AVX2,
                _ => unreachable!(),
            };
        }

        let val = vectorization_support_no_cache_x86();

        FLAGS.store(val as u8, Ordering::Relaxed);
        return val;
    }

    #[cfg(all(target_arch = "aarch64", target_feature = "neon"))]
    {
        use core::sync::atomic::{AtomicU8, Ordering};
        static FLAGS: AtomicU8 = AtomicU8::new(u8::MAX);

        let current_flags = FLAGS.load(Ordering::Relaxed);
        if current_flags != u8::MAX {
            return match current_flags {
                0 => Vectorization::None,
                3 => Vectorization::Neon,
                _ => unreachable!(),
            };
        }

        let val = vectorization_support_no_cache_arm();
        FLAGS.store(val as u8, Ordering::Relaxed);
        return val;
    }

    #[allow(unreachable_code)]
    Vectorization::None
}

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[cold]
fn vectorization_support_no_cache_x86() -> Vectorization {
    #[cfg(target_arch = "x86")]
    use core::arch::x86::__cpuid_count;
    #[cfg(target_arch = "x86_64")]
    use core::arch::x86_64::__cpuid_count;

    if cfg!(target_env = "sgx") || !cfg!(target_feature = "sse") {
        return Vectorization::None;
    }

    let proc_info_ecx = __cpuid_count(1, 0).ecx;
    let have_sse4 = (proc_info_ecx >> 19) & 1 == 1;
    let have_osxsave = (proc_info_ecx >> 27) & 1 == 1;
    let have_avx = (proc_info_ecx >> 28) & 1 == 1;

    if !have_sse4 {
        return Vectorization::None;
    }

    if !have_avx || !have_osxsave || cfg!(miri) {
        return Vectorization::SSE41;
    }

    let have_avx2 = __cpuid_count(7, 0).ebx & 0b100 == 0b100;

    if have_avx2 {
        Vectorization::AVX2
    } else {
        Vectorization::SSE41
    }
}

#[cfg(target_arch = "aarch64")]
#[cold]
fn vectorization_support_no_cache_arm() -> Vectorization {
    Vectorization::Neon
}