use tauri_plugin_dialog::DialogExt;

/// Opens a native folder picker dialog and returns the selected path.
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .set_title("Select Profiles Directory")
        .pick_folder(move |folder| {
            let path = folder.map(|f| f.to_string());
            let _ = tx.send(path);
        });

    rx.recv()
        .map_err(|e| format!("Dialog cancelled: {}", e))
}

/// Opens a native file picker dialog and returns the selected path.
#[tauri::command]
pub async fn pick_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .add_filter("SII Save File", &["sii"])
        .set_title("Select SII File")
        .pick_file(move |file| {
            let path = file.map(|f| f.to_string());
            let _ = tx.send(path);
        });

    rx.recv()
        .map_err(|e| format!("Dialog cancelled: {}", e))
}

/// Opens a native save file dialog and returns the selected path.
#[tauri::command]
pub async fn save_file_dialog(app: tauri::AppHandle, default_name: String) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .add_filter("SII Save File", &["sii"])
        .set_title("Save Decrypted File")
        .set_file_name(default_name)
        .save_file(move |file| {
            let path = file.map(|f| f.to_string());
            let _ = tx.send(path);
        });

    rx.recv()
        .map_err(|e| format!("Dialog cancelled: {}", e))
}
