use serde::{Serialize, Deserialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct GameProfile {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub async fn auto_detect_profiles() -> Result<Option<String>, String> {
    let user_profile = std::env::var("USERPROFILE").map_err(|_| "Could not find USERPROFILE environment variable")?;
    let base_path = Path::new(&user_profile);
    
    // Common paths for ETS2/ATS on Windows
    let paths = vec![
        "Documents/Euro Truck Simulator 2/profiles",
        "Documents/American Truck Simulator/profiles",
    ];

    for sub_path in paths {
        let full_path = base_path.join(sub_path);
        if full_path.exists() && full_path.is_dir() {
            return Ok(Some(full_path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn get_game_profiles(path: String) -> Result<Vec<GameProfile>, String> {
    let base_path = Path::new(&path);
    if !base_path.exists() || !base_path.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", path));
    }

    let mut profiles = Vec::new();

    let entries = fs::read_dir(base_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Error reading entry: {}", e))?;
        let dir_path = entry.path();

        if dir_path.is_dir() {
            let profile_sii_path = dir_path.join("profile.sii");
            let dirname = entry.file_name().to_string_lossy().to_string();
            
            let mut display_name = dirname.clone();

            if profile_sii_path.exists() {
                // Try to read and decrypt the profile name
                if let Ok(data) = fs::read(&profile_sii_path) {
                    // Call the processing logic from our sii module
                    if let Ok(decoded_bytes) = crate::sii::process(&data) {
                        if let Ok(content) = String::from_utf8(decoded_bytes) {
                            // Look for profile_name: "Name"
                            if let Some(name) = extract_profile_name(&content) {
                                display_name = name;
                            }
                        }
                    }
                }
            }

            profiles.push(GameProfile {
                id: dirname,
                name: display_name,
                path: dir_path.to_string_lossy().to_string(),
            });
        }
    }

    // Sort by name for a better UI experience
    profiles.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(profiles)
}

/// Helper to find the profile_name in the SiiNunit text
fn extract_profile_name(content: &str) -> Option<String> {
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("profile_name:") {
            // Format is usually -> profile_name: "Name"
            let parts: Vec<&str> = line.splitn(2, ':').collect();
            if parts.len() == 2 {
                let name = parts[1].trim();
                // Strip quotes
                let name = name.trim_matches('"');
                if !name.is_empty() {
                    return Some(name.to_string());
                }
            }
        }
    }
    None
}
