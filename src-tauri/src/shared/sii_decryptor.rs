use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DecryptorConfig {
    pub instant_mode: bool,
    pub history: Vec<HistoryItem>,
}

impl Default for DecryptorConfig {
    fn default() -> Self {
        Self {
            instant_mode: false,
            history: Vec::new(),
        }
    }
}

fn get_config_path() -> Result<PathBuf, String> {
    let user_profile = std::env::var("USERPROFILE").map_err(|_| "Could not find USERPROFILE environment variable".to_string())?;
    let dir = Path::new(&user_profile).join(".quicksave_gui");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    Ok(dir.join("decryptor_config.json"))
}

fn load_config() -> DecryptorConfig {
    if let Ok(path) = get_config_path() {
        if path.exists() {
            if let Ok(data) = fs::read_to_string(path) {
                if let Ok(config) = serde_json::from_str(&data) {
                    return config;
                }
            }
        }
    }
    DecryptorConfig::default()
}

fn save_config(config: &DecryptorConfig) -> Result<(), String> {
    let path = get_config_path()?;
    let serialized = serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(path, serialized).map_err(|e| format!("Failed to write config file: {}", e))
}

#[tauri::command]
pub async fn get_decryptor_config() -> Result<DecryptorConfig, String> {
    Ok(load_config())
}

#[tauri::command]
pub async fn save_decryptor_config(config: DecryptorConfig) -> Result<(), String> {
    save_config(&config)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DecryptResult {
    pub decrypted_text: Option<String>,
    pub file_name: String,
    pub file_path: String,
    pub is_instant: bool,
}

#[tauri::command]
pub async fn decrypt_sii_file(path: String, instant_mode: bool) -> Result<DecryptResult, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let file_name = file_path
        .file_name()
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string_lossy()
        .to_string();

    // Read file bytes
    let data = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Decrypt using crate::sii::process
    let decoded_bytes = crate::sii::process(&data).map_err(|e| format!("Decryption failed: {}", e))?;
    let decrypted_text = String::from_utf8(decoded_bytes).map_err(|e| format!("Decrypted data is not valid UTF-8: {}", e))?;

    // Update config history
    let mut config = load_config();
    config.instant_mode = instant_mode;

    // Create new history item
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let item_id = now.to_string();

    // Remove any existing entries for the same path
    config.history.retain(|item| item.path != path);

    // Add to start of list
    config.history.insert(0, HistoryItem {
        id: item_id,
        name: file_name.clone(),
        path: path.clone(),
        timestamp: now,
    });

    // Keep only last 10 entries
    config.history.truncate(10);

    // Save config back to file
    let _ = save_config(&config);

    if instant_mode {
        // Overwrite original file
        fs::write(file_path, &decrypted_text).map_err(|e| format!("Failed to overwrite file: {}", e))?;
        Ok(DecryptResult {
            decrypted_text: None,
            file_name,
            file_path: path,
            is_instant: true,
        })
    } else {
        Ok(DecryptResult {
            decrypted_text: Some(decrypted_text),
            file_name,
            file_path: path,
            is_instant: false,
        })
    }
}

#[tauri::command]
pub async fn clear_decryptor_history() -> Result<(), String> {
    let mut config = load_config();
    config.history.clear();
    save_config(&config)
}

#[tauri::command]
pub async fn remove_decryptor_history_item(id: String) -> Result<(), String> {
    let mut config = load_config();
    config.history.retain(|item| item.id != id);
    save_config(&config)
}
