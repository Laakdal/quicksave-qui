#![cfg(target_os = "windows")]
#![allow(non_snake_case)]

use windows_sys::Win32::{
    Foundation::{HWND, S_OK},
    Graphics::Dwm::{
        DwmSetWindowAttribute, DWMSBT_MAINWINDOW, DWMSBT_NONE, DWMWA_SYSTEMBACKDROP_TYPE,
        DWMWA_USE_IMMERSIVE_DARK_MODE, DWMWINDOWATTRIBUTE,
    },
};

const DWMWA_MICA_EFFECT: DWMWINDOWATTRIBUTE = 1029;

pub fn apply_mica(hwnd: HWND, dark: Option<bool>) -> Result<(), String> {
    if let Some(dark) = dark {
        unsafe {
            dwm_set_window_attribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE as _, &(dark as u32))?;
        }
    }

    if is_backdroptype_supported() {
        unsafe {
            dwm_set_window_attribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE as _, &DWMSBT_MAINWINDOW)?;
        }
    } else if is_undocumented_mica_supported() {
        unsafe {
            dwm_set_window_attribute(hwnd, DWMWA_MICA_EFFECT as _, &1)?;
        }
    } else {
        return Err("apply_mica() is only available on Windows 11.".to_string());
    }

    Ok(())
}

pub fn clear_mica(hwnd: HWND) -> Result<(), String> {
    if is_backdroptype_supported() {
        unsafe {
            dwm_set_window_attribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE as _, &DWMSBT_NONE)?;
        }
    } else if is_undocumented_mica_supported() {
        unsafe {
            dwm_set_window_attribute(hwnd, DWMWA_MICA_EFFECT as _, &0)?;
        }
    } else {
        return Err("clear_mica() is only available on Windows 11.".to_string());
    }

    Ok(())
}

unsafe fn dwm_set_window_attribute<T>(hwnd: HWND, kind: u32, object: &T) -> Result<(), String> {
    let size = std::mem::size_of::<T>() as u32;
    let result = unsafe { DwmSetWindowAttribute(hwnd, kind, object as *const _ as _, size) };
    if result == S_OK {
        Ok(())
    } else {
        Err(format!("DwmSetWindowAttribute failed with HRESULT {result}"))
    }
}

fn is_at_least_build(build: u32) -> bool {
    windows_version::OsVersion::current().build >= build
}

fn is_undocumented_mica_supported() -> bool {
    is_at_least_build(22000)
}

fn is_backdroptype_supported() -> bool {
    is_at_least_build(22523)
}
