use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct TruckDetail {
    pub id: String,
    pub brand_id: String,
    pub display_name: String,
    pub license_plate: String,
    pub accessories: Vec<String>,
    pub garage: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct PlayerVehicles {
    pub trucks: Vec<TruckDetail>,
    pub my_truck: Option<String>,
    pub assigned_truck: Option<String>,
}

fn map_truck_name(brand_id: &str) -> &str {
    match brand_id {
        "volvo.fh_2024" => "Volvo FH Aero (2024)",
        "volvo.fh_2021" => "Volvo FH 2021",
        "volvo.fh16_2012" => "Volvo FH16 2012",
        "volvo.fh16" => "Volvo FH16 Classic",
        "scania.s_2016" => "Scania S Next Gen",
        "scania.r_2016" => "Scania R Next Gen",
        "scania.streamline" => "Scania Streamline",
        "scania.r" => "Scania R 2009",
        "man.tgx_2020" => "MAN TGX 2020",
        "man.tgx_euro6" => "MAN TGX Euro 6",
        "man.tgx" => "MAN TGX Classic",
        "daf.xd" => "DAF XD",
        "daf.2021" => "DAF XF/XG/XG+ 2021",
        "daf.xf_euro6" => "DAF XF Euro 6",
        "daf.xf" => "DAF XF105",
        "renault.t" => "Renault T Range",
        "renault.premium" => "Renault Premium",
        "renault.magnum" => "Renault Magnum",
        "mercedes.new_actros" => "Mercedes-Benz New Actros (MP4)",
        "mercedes.actros" => "Mercedes-Benz Actros (MP3)",
        "iveco.sway" => "Iveco S-Way",
        "iveco.hiway" => "Iveco Stralis Hi-Way",
        "iveco.stralis" => "Iveco Stralis",
        _ => brand_id,
    }
}

fn clean_license_plate(plate: &str) -> String {
    // Remove formatting tags like <offset...> or <img...>
    let re_tags = Regex::new(r"<[^>]*>").unwrap();
    let cleaned = re_tags.replace_all(plate, "");

    // Format: "Plate | country" -> "Plate | Country"
    if cleaned.contains('|') {
        let parts: Vec<&str> = cleaned.split('|').collect();
        if parts.len() >= 2 {
            let text = parts[0].trim();
            let country = parts[1].trim();
            if text.is_empty() {
                return country.to_string();
            }
            return format!("{} | {}", text, country);
        }
    }
    cleaned.to_string()
}

#[tauri::command]
pub fn get_player_vehicles(path: String) -> Result<PlayerVehicles, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let decoded = crate::sii::process(&data).map_err(|e| e.to_string())?;
    let content = String::from_utf8(decoded).map_err(|e| e.to_string())?;

    let mut vehicles = PlayerVehicles::default();
    let mut nameless_blocks: HashMap<String, Vec<String>> = HashMap::new();
    let mut garage_map: HashMap<String, String> = HashMap::new(); // vehicle_id -> garage_city

    // 1. Index all blocks and identify types
    let mut current_block_id = String::new();
    let mut current_block_type = String::new();
    let mut in_block = false;
    let mut player_block_id = String::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        if line.contains(" : ") && line.ends_with('{') {
            let parts: Vec<&str> = line[..line.len() - 1].split(':').collect();
            if parts.len() >= 2 {
                current_block_type = parts[0].trim().to_string();
                current_block_id = parts[1].trim().to_string();
                nameless_blocks.insert(current_block_id.clone(), Vec::new());
                in_block = true;

                if current_block_type == "player" {
                    player_block_id = current_block_id.clone();
                }
            }
        } else if line == "}" {
            // Post-process garage blocks to map vehicles
            if current_block_type == "garage" {
                if let Some(lines) = nameless_blocks.get(&current_block_id) {
                    let mut city = String::new();
                    let mut vehicles_in_garage = Vec::new();
                    for l in lines {
                        if l.starts_with("vehicles[") {
                            if let Some(idx) = l.find(':') {
                                vehicles_in_garage.push(l[idx + 1..].trim().to_string());
                            }
                        } else if l.starts_with("garage_name:") {
                            city = l[l.find(':').unwrap() + 1..].trim().replace("\"", "");
                        }
                    }
                    if city.is_empty() {
                        city = current_block_id.clone();
                    }
                    for v_id in vehicles_in_garage {
                        if v_id != "null" {
                            garage_map.insert(v_id, city.clone());
                        }
                    }
                }
            }
            in_block = false;
        } else if in_block {
            if let Some(block) = nameless_blocks.get_mut(&current_block_id) {
                block.push(line.to_string());
            }
        }
    }

    // 2. Find player block and its initial data
    if player_block_id.is_empty() {
        return Err("Player block not found".to_string());
    }

    let mut truck_ids = Vec::new();
    if let Some(lines) = nameless_blocks.get(&player_block_id) {
        for line in lines {
            if line.starts_with("trucks[") {
                if let Some(idx) = line.find(':') {
                    truck_ids.push(line[idx + 1..].trim().to_string());
                }
            } else if line.starts_with("my_truck:") {
                let val = line[line.find(':').unwrap() + 1..].trim();
                if val != "null" {
                    vehicles.my_truck = Some(val.to_string());
                }
            } else if line.starts_with("assigned_truck:") {
                let val = line[line.find(':').unwrap() + 1..].trim();
                if val != "null" {
                    vehicles.assigned_truck = Some(val.to_string());
                }
            }
        }
    }

    // 3. Resolve truck details
    for t_id in truck_ids {
        if let Some(t_lines) = nameless_blocks.get(&t_id) {
            let mut detail = TruckDetail {
                id: t_id.clone(),
                garage: garage_map
                    .get(&t_id)
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string()),
                ..Default::default()
            };

            let mut accessory_ids = Vec::new();

            for line in t_lines {
                if line.starts_with("license_plate:") {
                    let plate_raw = line[line.find(':').unwrap() + 1..].trim().replace("\"", "");
                    detail.license_plate = clean_license_plate(&plate_raw);
                } else if line.starts_with("accessories[") {
                    if let Some(idx) = line.find(':') {
                        accessory_ids.push(line[idx + 1..].trim().to_string());
                    }
                }
            }

            // Trace accessories to find truck brand and all accessory paths
            for acc_id in accessory_ids {
                if let Some(acc_lines) = nameless_blocks.get(&acc_id) {
                    for acc_line in acc_lines {
                        if acc_line.starts_with("data_path:") {
                            let path = acc_line[acc_line.find(':').unwrap() + 1..]
                                .trim()
                                .replace("\"", "");
                            detail.accessories.push(path.clone());

                            // Check if this is the "data.sii" accessory that defines the truck
                            if path.contains("/truck/") && path.ends_with("/data.sii") {
                                // Extract brand from path: def/vehicle/truck/brand.model/data.sii
                                if let Some(truck_idx) = path.find("/truck/") {
                                    let sub = &path[truck_idx + 7..];
                                    if let Some(end_idx) = sub.find('/') {
                                        detail.brand_id = sub[..end_idx].to_string();
                                        detail.display_name = map_truck_name(&detail.brand_id).to_string();
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if detail.display_name.is_empty() {
                detail.display_name = t_id
                    .split('.')
                    .last()
                    .unwrap_or("Unknown Truck")
                    .to_string();
            }

            vehicles.trucks.push(detail);
        }
    }

    Ok(vehicles)
}
