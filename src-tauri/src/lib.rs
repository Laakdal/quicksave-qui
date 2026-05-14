pub mod sii;
pub mod commands;

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
            commands::profile::get_game_profiles,
            commands::profile::get_game_saves,
            commands::profile::auto_detect_profiles,
            commands::dialog::pick_folder,
            commands::dialog::pick_file,
            commands::dialog::save_file_dialog,
            commands::ownedvehicle::get_player_vehicles
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
