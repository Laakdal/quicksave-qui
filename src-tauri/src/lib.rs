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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, decode_sii])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
