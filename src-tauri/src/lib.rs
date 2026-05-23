pub mod save_manager;
pub mod shared;
pub mod sii;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Decrypt / decode a raw SII file buffer and return the SiiNunit text.
///
/// The frontend sends the file contents as a `Vec<u8>`, and this command
/// returns the decoded UTF-8 string.
#[tauri::command]
fn decode_sii(data: Vec<u8>) -> Result<String, String> {
    let decoded = sii::process(&data).map_err(|e| e.to_string())?;
    String::from_utf8(decoded).map_err(|e| e.to_string())
}

#[tauri::command]
fn decode_sii_path(path: String) -> Result<String, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let decoded = sii::process(&data).map_err(|e| e.to_string())?;
    String::from_utf8(decoded).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn apply_window_mica(window: tauri::Window) -> Result<(), String> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};

    let handle = window
        .window_handle()
        .map_err(|error| format!("Failed to get window handle: {error}"))?;

    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => handle.hwnd.get() as _,
        _ => return Err("Mica is only available on Windows.".to_string()),
    };

    shared::win_translucent::apply_mica(hwnd, Some(true)).map_err(|error| error.to_string())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn apply_window_mica(_window: tauri::Window) -> Result<(), String> {
    Err("Mica is only available on Windows.".to_string())
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn clear_window_mica(window: tauri::Window) -> Result<(), String> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};

    let handle = window
        .window_handle()
        .map_err(|error| format!("Failed to get window handle: {error}"))?;

    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => handle.hwnd.get() as _,
        _ => return Err("Mica is only available on Windows.".to_string()),
    };

    shared::win_translucent::clear_mica(hwnd).map_err(|error| error.to_string())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn clear_window_mica(_window: tauri::Window) -> Result<(), String> {
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            decode_sii,
            decode_sii_path,
            write_file,
            apply_window_mica,
            clear_window_mica,
            shared::profile::get_game_profiles,
            shared::profile::get_game_saves,
            shared::profile::auto_detect_profiles,
            shared::win_dialog::pick_folder,
            shared::win_dialog::pick_file,
            shared::win_dialog::save_file_dialog,
            save_manager::owned_truck::get_player_vehicles,
            save_manager::owned_truck::save_active_truck,
            save_manager::owned_truck::save_truck_accessories,
            save_manager::vault::list_locked_blocks,
            save_manager::vault::lock_block,
            save_manager::vault::unlock_block
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
