use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default)]
pub struct PlayerVehicles {
    pub trucks: Vec<String>,
    pub my_truck: Option<String>,
    pub trailers: Vec<String>,
    pub assigned_trailer: Option<String>,
}

#[tauri::command]
pub fn get_player_vehicles(content: String) -> Result<PlayerVehicles, String> {
    let mut vehicles = PlayerVehicles::default();

    // Find the player block start
    let player_start = match content.find("player : _nameless") {
        Some(idx) => idx,
        None => return Err("Player block not found".into()),
    };

    // Find the opening brace of the player block
    let block_start = match content[player_start..].find('{') {
        Some(idx) => player_start + idx + 1,
        None => return Err("Player block '{' not found".into()),
    };

    // Find the closing brace of the player block
    let block_end = match content[block_start..].find('}') {
        Some(idx) => block_start + idx,
        None => return Err("Player block '}' not found".into()),
    };

    // Extract just the inner content of the player block
    let player_block = &content[block_start..block_end];

    // Process each line in the player block
    for line in player_block.lines() {
        let line = line.trim();
        
        if line.starts_with("trucks[") {
            if let Some(idx) = line.find(':') {
                let val = line[idx + 1..].trim();
                vehicles.trucks.push(val.to_string());
            }
        } else if line.starts_with("trailers[") {
            if let Some(idx) = line.find(':') {
                let val = line[idx + 1..].trim();
                vehicles.trailers.push(val.to_string());
            }
        } else if line.starts_with("my_truck:") {
            if let Some(idx) = line.find(':') {
                let val = line[idx + 1..].trim();
                if val != "null" {
                    vehicles.my_truck = Some(val.to_string());
                }
            }
        } else if line.starts_with("assigned_trailer:") {
            if let Some(idx) = line.find(':') {
                let val = line[idx + 1..].trim();
                if val != "null" {
                    vehicles.assigned_trailer = Some(val.to_string());
                }
            }
        }
    }

    Ok(vehicles)
}
