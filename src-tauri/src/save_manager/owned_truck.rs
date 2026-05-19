use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct TruckAccessoryDetail {
    pub id: String,
    pub block_type: String,
    pub data_path: String,
    pub lines: Vec<String>,
    pub wheel_offset: Option<i32>,
    pub paint_colors: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct TruckDetail {
    pub id: String,
    pub brand_id: String,
    pub display_name: String,
    pub license_plate: String,
    pub accessories: Vec<TruckAccessoryDetail>,
    pub accessories_count: usize,
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

fn extract_field_value(line: &str) -> Option<String> {
    let idx = line.find(':')?;
    Some(line[idx + 1..].trim().replace('"', ""))
}

fn extract_raw_field_value(line: &str) -> Option<String> {
    let idx = line.find(':')?;
    Some(line[idx + 1..].trim().to_string())
}

fn parse_wheel_offset(block_type: &str, lines: &[String]) -> Option<i32> {
    if block_type != "vehicle_wheel_accessory" {
        return None;
    }

    lines
        .iter()
        .find(|line| line.starts_with("offset:"))
        .and_then(|line| extract_raw_field_value(line))
        .and_then(|value| value.parse::<i32>().ok())
}

fn parse_paint_colors(block_type: &str, lines: &[String]) -> HashMap<String, String> {
    if block_type != "vehicle_paint_job_accessory" {
        return HashMap::new();
    }

    lines
        .iter()
        .filter_map(|line| {
            let idx = line.find(':')?;
            let key = line[..idx].trim();
            if key.ends_with("_color") || key == "base_color" {
                Some((key.to_string(), line[idx + 1..].trim().to_string()))
            } else {
                None
            }
        })
        .collect()
}

fn is_truck_accessory_block_type(block_type: &str) -> bool {
    matches!(
        block_type,
        "vehicle_accessory"
            | "vehicle_addon_accessory"
            | "vehicle_wheel_accessory"
            | "vehicle_cargo_accessory"
            | "vehicle_driver_plate_accessory"
            | "vehicle_paint_job_accessory"
    )
}

#[tauri::command]
pub fn get_player_vehicles(path: String) -> Result<PlayerVehicles, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let decoded = crate::sii::process(&data).map_err(|e| e.to_string())?;
    let content = String::from_utf8(decoded).map_err(|e| e.to_string())?;

    let mut vehicles = PlayerVehicles::default();
    let mut nameless_blocks: HashMap<String, Vec<String>> = HashMap::new();
    let mut block_types: HashMap<String, String> = HashMap::new();
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
                block_types.insert(current_block_id.clone(), current_block_type.clone());
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

            // Trace truck accessory blocks to find truck brand and accessory paths
            for acc_id in accessory_ids {
                let Some(block_type) = block_types.get(&acc_id) else {
                    continue;
                };

                if !is_truck_accessory_block_type(block_type) {
                    continue;
                }

                if let Some(acc_lines) = nameless_blocks.get(&acc_id) {
                    for acc_line in acc_lines {
                        if acc_line.starts_with("data_path:") {
                            let path = extract_field_value(acc_line).unwrap_or_default();
                            detail.accessories.push(TruckAccessoryDetail {
                                id: acc_id.clone(),
                                block_type: block_type.clone(),
                                data_path: path.clone(),
                                lines: acc_lines.clone(),
                                wheel_offset: parse_wheel_offset(block_type, acc_lines),
                                paint_colors: parse_paint_colors(block_type, acc_lines),
                            });

                            if path.contains("/truck/") && path.ends_with("/data.sii") {
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

            detail.accessories_count = detail.accessories.len();

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
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SaveTruckAccessoryChange {
    pub id: Option<String>,
    pub block_type: String,
    pub lines: Vec<String>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SaveTruckAccessoriesRequest {
    pub path: String,
    pub truck_id: String,
    pub changes: Vec<SaveTruckAccessoryChange>,
}

fn generate_nameless_id(seed: usize) -> String {
    format!("_nameless.qsg.{seed:x}")
}

fn generate_unused_nameless_id(used_ids: &mut HashSet<String>, seed: &mut usize) -> String {
    loop {
        let candidate = generate_nameless_id(*seed);
        *seed += 1;
        if used_ids.insert(candidate.clone()) {
            return candidate;
        }
    }
}

fn render_accessory_block(block_type: &str, id: &str, lines: &[String]) -> Vec<String> {
    let mut block = Vec::with_capacity(lines.len() + 2);
    block.push(format!("{} : {} {{", block_type, id));
    block.extend(lines.iter().map(|line| format!(" {}", line.trim())));
    block.push("}".to_string());
    block
}

#[tauri::command]
pub fn save_truck_accessories(request: SaveTruckAccessoriesRequest) -> Result<(), String> {
    let data = std::fs::read(&request.path).map_err(|e| format!("Failed to read file: {}", e))?;
    if !data.starts_with(b"SiiN") {
        return Err("Saving truck accessories requires a plaintext SII file".to_string());
    }

    let content = String::from_utf8(data).map_err(|e| e.to_string())?;
    let lines: Vec<String> = content.lines().map(ToString::to_string).collect();

    let mut used_block_ids = HashSet::new();
    for line in &lines {
        let trimmed = line.trim();
        if trimmed.contains(" : ") && trimmed.ends_with('{') {
            let header = trimmed.trim_end_matches('{').trim();
            let parts: Vec<&str> = header.split(':').collect();
            if parts.len() >= 2 {
                used_block_ids.insert(parts[1].trim().to_string());
            }
        }
    }

    let mut ids_to_delete = Vec::new();
    let mut edited_blocks: HashMap<String, (String, Vec<String>)> = HashMap::new();
    let mut added_blocks: Vec<(String, String, Vec<String>)> = Vec::new();
    let mut nameless_seed = 0usize;

    for change in request.changes.iter() {
        match change.status.as_str() {
            "deleted" => {
                if let Some(id) = &change.id {
                    ids_to_delete.push(id.clone());
                }
            }
            "edited" => {
                if let Some(id) = &change.id {
                    edited_blocks.insert(id.clone(), (change.block_type.clone(), change.lines.clone()));
                }
            }
            "added" => {
                let id = match change
                    .id
                    .clone()
                    .filter(|value| !value.starts_with("temp-"))
                {
                    Some(id) => {
                        used_block_ids.insert(id.clone());
                        id
                    }
                    None => generate_unused_nameless_id(&mut used_block_ids, &mut nameless_seed),
                };
                added_blocks.push((id, change.block_type.clone(), change.lines.clone()));
            }
            _ => {}
        }
    }

    let mut result = Vec::new();
    let mut i = 0usize;
    while i < lines.len() {
        let trimmed = lines[i].trim();
        let mut handled_block = false;

        if trimmed.contains(" : ") && trimmed.ends_with('{') {
            let header = trimmed.trim_end_matches('{').trim();
            let parts: Vec<&str> = header.split(':').collect();
            if parts.len() >= 2 {
                let block_type = parts[0].trim().to_string();
                let block_id = parts[1].trim().to_string();

                if ids_to_delete.iter().any(|id| id == &block_id) {
                    i += 1;
                    while i < lines.len() && lines[i].trim() != "}" {
                        i += 1;
                    }
                    i += 1;
                    handled_block = true;
                } else if let Some((new_block_type, new_lines)) = edited_blocks.get(&block_id) {
                    result.extend(render_accessory_block(new_block_type, &block_id, new_lines));
                    i += 1;
                    while i < lines.len() && lines[i].trim() != "}" {
                        i += 1;
                    }
                    i += 1;
                    handled_block = true;
                } else if block_type == "vehicle" && block_id == request.truck_id {
                    result.push(lines[i].clone());
                    i += 1;
                    let mut retained_accessories = Vec::new();
                    while i < lines.len() && lines[i].trim() != "}" {
                        let line_trimmed = lines[i].trim();
                        let accessory_reference = if line_trimmed.starts_with("accessories[") {
                            extract_raw_field_value(line_trimmed)
                        } else {
                            None
                        };
                        let should_drop_reference = accessory_reference
                            .as_ref()
                            .is_some_and(|value| ids_to_delete.iter().any(|id| value == id));
                        if let Some(accessory_id) = accessory_reference {
                            if !should_drop_reference {
                                retained_accessories.push(accessory_id);
                            }
                        } else {
                            result.push(lines[i].clone());
                        }
                        i += 1;
                    }
                    for (index, id) in retained_accessories.iter().enumerate() {
                        result.push(format!(" accessories[{}]: {}", index, id));
                    }
                    for (offset, (id, _, _)) in added_blocks.iter().enumerate() {
                        result.push(format!(
                            " accessories[{}]: {}",
                            retained_accessories.len() + offset,
                            id
                        ));
                    }
                    if i < lines.len() {
                        result.push(lines[i].clone());
                        i += 1;
                    }
                    handled_block = true;
                }
            }
        }

        if !handled_block {
            result.push(lines[i].clone());
            i += 1;
        }
    }

    if !added_blocks.is_empty() {
        let insert_at = result
            .iter()
            .rposition(|line| line.trim() == "}")
            .ok_or_else(|| "Root closing brace not found".to_string())?;
        let mut rendered_added_blocks = Vec::new();
        for (id, block_type, block_lines) in added_blocks {
            rendered_added_blocks.extend(render_accessory_block(&block_type, &id, &block_lines));
        }
        result.splice(insert_at..insert_at, rendered_added_blocks);
    }

    std::fs::write(&request.path, result.join("\n"))
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn save_active_truck(path: String, truck_id: String) -> Result<(), String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    if !data.starts_with(b"SiiN") {
        return Err("Saving active truck requires a plaintext SII file".to_string());
    }

    let content = String::from_utf8(data).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    let mut in_player_block = false;
    let mut player_depth = 0usize;
    let mut found_player = false;
    let mut updated_my_truck = false;
    let mut updated_assigned_truck = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("player :") && trimmed.ends_with('{') {
            in_player_block = true;
            player_depth = 1;
            found_player = true;
            result.push(line.to_string());
            continue;
        }

        if in_player_block {
            if trimmed.ends_with('{') {
                player_depth += 1;
            }

            if trimmed.starts_with("my_truck:") {
                let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
                result.push(format!("{}my_truck: {}", indent, truck_id));
                updated_my_truck = true;
                continue;
            }

            if trimmed.starts_with("assigned_truck:") {
                let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
                result.push(format!("{}assigned_truck: {}", indent, truck_id));
                updated_assigned_truck = true;
                continue;
            }

            if trimmed == "}" {
                player_depth = player_depth.saturating_sub(1);
                if player_depth == 0 {
                    in_player_block = false;
                }
            }
        }

        result.push(line.to_string());
    }

    if !found_player {
        return Err("Player block not found".to_string());
    }

    if !updated_my_truck {
        return Err("my_truck line not found".to_string());
    }

    if !updated_assigned_truck {
        return Err("assigned_truck line not found".to_string());
    }

    std::fs::write(&path, result.join("\n")).map_err(|e| format!("Failed to write file: {}", e))
}

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use std::time::{SystemTime, UNIX_EPOCH};

//     #[test]
//     fn get_player_vehicles_returns_accessory_metadata_count_offsets_and_paint_colors() {
//         let suffix = SystemTime::now()
//             .duration_since(UNIX_EPOCH)
//             .unwrap()
//             .as_nanos();
//         let path = std::env::temp_dir().join(format!(
//             "project_quicksave_owned_truck_rich_accessories_{suffix}.sii"
//         ));

//         let content = r#"SiiNunit
// {
// player : .player {
//  trucks[0]: .truck
// }
// vehicle : .truck {
//  accessories[0]: .wheel_accessory
//  accessories[1]: .paint_accessory
// }
// vehicle_wheel_accessory : .wheel_accessory {
//  offset: 4
//  paint_color: (1, 1, 1)
//  data_path: "/def/vehicle/trailer_wheel/f_nuts/nuts_chrome_0.sii"
//  refund: 810
// }
// vehicle_paint_job_accessory : .paint_accessory {
//  mask_r_color: (1, 0, 0)
//  mask_g_color: (0, 1, 0)
//  mask_b_color: (0, 0, 1)
//  data_path: "/def/vehicle/trailer_owned/kassbohrer.sll/paint_job/color_custom.sii"
//  refund: 5200
// }
// }
// "#;

//         std::fs::write(&path, content).unwrap();

//         let vehicles = get_player_vehicles(path.to_string_lossy().to_string()).unwrap();

//         std::fs::remove_file(&path).unwrap();

//         let truck = vehicles.trucks.first().unwrap();
//         assert_eq!(truck.accessories_count, 2);

//         let wheel = truck
//             .accessories
//             .iter()
//             .find(|accessory| accessory.id == ".wheel_accessory")
//             .unwrap();
//         assert_eq!(wheel.block_type, "vehicle_wheel_accessory");
//         assert_eq!(wheel.data_path, "/def/vehicle/trailer_wheel/f_nuts/nuts_chrome_0.sii");
//         assert_eq!(wheel.wheel_offset, Some(4));
//         assert_eq!(
//             wheel.lines,
//             vec![
//                 "offset: 4".to_string(),
//                 "paint_color: (1, 1, 1)".to_string(),
//                 "data_path: \"/def/vehicle/trailer_wheel/f_nuts/nuts_chrome_0.sii\"".to_string(),
//                 "refund: 810".to_string(),
//             ]
//         );

//         let paint = truck
//             .accessories
//             .iter()
//             .find(|accessory| accessory.id == ".paint_accessory")
//             .unwrap();
//         assert_eq!(paint.block_type, "vehicle_paint_job_accessory");
//         assert_eq!(
//             paint.paint_colors.get("mask_r_color"),
//             Some(&"(1, 0, 0)".to_string())
//         );
//         assert_eq!(
//             paint.paint_colors.get("mask_g_color"),
//             Some(&"(0, 1, 0)".to_string())
//         );
//     }

//     #[test]
//     fn save_truck_accessories_edits_deletes_and_adds_plaintext_blocks() {
//         let suffix = SystemTime::now()
//             .duration_since(UNIX_EPOCH)
//             .unwrap()
//             .as_nanos();
//         let path = std::env::temp_dir().join(format!(
//             "project_quicksave_save_truck_accessories_{suffix}.sii"
//         ));

//         let content = r#"SiiNunit
// {
// player : .player {
//  trucks[0]: .truck
// }
// vehicle : .truck {
//  accessories[0]: .keep_accessory
//  accessories[1]: .delete_accessory
// }
// vehicle_accessory : .keep_accessory {
//  data_path: "/old/path.sii"
//  refund: 1
// }
// vehicle_wheel_accessory : .delete_accessory {
//  offset: 4
//  data_path: "/delete/path.sii"
//  refund: 2
// }
// }
// "#;
//         std::fs::write(&path, content).unwrap();

//         save_truck_accessories(SaveTruckAccessoriesRequest {
//             path: path.to_string_lossy().to_string(),
//             truck_id: ".truck".to_string(),
//             changes: vec![
//                 SaveTruckAccessoryChange {
//                     id: Some(".keep_accessory".to_string()),
//                     block_type: "vehicle_accessory".to_string(),
//                     lines: vec![
//                         "data_path: \"/edited/path.sii\"".to_string(),
//                         "refund: 9".to_string(),
//                     ],
//                     status: "edited".to_string(),
//                 },
//                 SaveTruckAccessoryChange {
//                     id: Some(".delete_accessory".to_string()),
//                     block_type: "vehicle_wheel_accessory".to_string(),
//                     lines: Vec::new(),
//                     status: "deleted".to_string(),
//                 },
//                 SaveTruckAccessoryChange {
//                     id: None,
//                     block_type: "vehicle_cargo_accessory".to_string(),
//                     lines: vec![
//                         "cargo_data: cargo.mob_screener".to_string(),
//                         "data_path: \"/added/path.sii\"".to_string(),
//                         "refund: 0".to_string(),
//                     ],
//                     status: "added".to_string(),
//                 },
//             ],
//         })
//         .unwrap();

//         let updated = std::fs::read_to_string(&path).unwrap();
//         std::fs::remove_file(&path).unwrap();

//         assert!(updated.contains("vehicle_accessory : .keep_accessory {"));
//         assert!(updated.contains("data_path: \"/edited/path.sii\""));
//         assert!(!updated.contains(".delete_accessory"));
//         assert!(updated.contains("vehicle_cargo_accessory : _nameless."));
//         assert!(updated.contains("data_path: \"/added/path.sii\""));
//     }

//     #[test]
//     fn save_truck_accessories_uses_selected_truck_indexes_root_insertion_and_exact_delete_match() {
//         let suffix = SystemTime::now()
//             .duration_since(UNIX_EPOCH)
//             .unwrap()
//             .as_nanos();
//         let path = std::env::temp_dir().join(format!(
//             "project_quicksave_save_truck_accessories_regression_{suffix}.sii"
//         ));

//         let content = r#"SiiNunit
// {
// player : .player {
//  trucks[0]: .other_truck
//  trucks[1]: .truck
// }
// vehicle : .other_truck {
//  accessories[0]: .other_accessory
// }
// vehicle : .truck {
//  accessories[0]: .keep_accessory
//  accessories[1]: .prefix.foo
//  accessories[2]: .foo
//  accessories[3]: .foo_extra
// }
// vehicle_accessory : .other_accessory {
//  data_path: "/other/path.sii"
// }
// vehicle_accessory : .keep_accessory {
//  data_path: "/keep/path.sii"
// }
// vehicle_accessory : .prefix.foo {
//  data_path: "/prefix/path.sii"
// }
// vehicle_accessory : .foo {
//  data_path: "/delete/path.sii"
// }
// vehicle_accessory : .foo_extra {
//  data_path: "/extra/path.sii"
// }
// }
// "#;
//         std::fs::write(&path, content).unwrap();

//         save_truck_accessories(SaveTruckAccessoriesRequest {
//             path: path.to_string_lossy().to_string(),
//             truck_id: ".truck".to_string(),
//             changes: vec![
//                 SaveTruckAccessoryChange {
//                     id: Some(".foo".to_string()),
//                     block_type: "vehicle_accessory".to_string(),
//                     lines: Vec::new(),
//                     status: "deleted".to_string(),
//                 },
//                 SaveTruckAccessoryChange {
//                     id: Some(".added_accessory".to_string()),
//                     block_type: "vehicle_accessory".to_string(),
//                     lines: vec!["data_path: \"/added/path.sii\"".to_string()],
//                     status: "added".to_string(),
//                 },
//             ],
//         })
//         .unwrap();

//         let updated = std::fs::read_to_string(&path).unwrap();
//         std::fs::remove_file(&path).unwrap();

//         assert!(updated.contains(" accessories[0]: .other_accessory"));
//         assert!(updated.contains(" accessories[0]: .keep_accessory"));
//         assert!(updated.contains(" accessories[1]: .prefix.foo"));
//         assert!(updated.contains(" accessories[2]: .foo_extra"));
//         assert!(updated.contains(" accessories[3]: .added_accessory"));
//         assert!(!updated.contains(" accessories[4]:"));
//         assert!(!updated.lines().any(|line| line == " accessories[2]: .foo"));
//         assert!(!updated.contains("vehicle_accessory : .foo {"));

//         let added_block_position = updated
//             .find("vehicle_accessory : .added_accessory {")
//             .expect("added accessory block should be written");
//         let root_close_position = updated
//             .rfind("\n}")
//             .expect("root closing brace should exist");
//         assert!(
//             added_block_position < root_close_position,
//             "added accessory block must be before the final root closing brace"
//         );
//     }

//     #[test]
//     fn save_truck_accessories_generates_unused_nameless_id_for_added_blocks() {
//         let suffix = SystemTime::now()
//             .duration_since(UNIX_EPOCH)
//             .unwrap()
//             .as_nanos();
//         let path = std::env::temp_dir().join(format!(
//             "project_quicksave_save_truck_accessories_id_collision_{suffix}.sii"
//         ));

//         let content = r#"SiiNunit
// {
// vehicle : .truck {
// }
// vehicle_accessory : _nameless.qsg.0 {
//  data_path: "/existing/path.sii"
// }
// }
// "#;
//         std::fs::write(&path, content).unwrap();

//         save_truck_accessories(SaveTruckAccessoriesRequest {
//             path: path.to_string_lossy().to_string(),
//             truck_id: ".truck".to_string(),
//             changes: vec![SaveTruckAccessoryChange {
//                 id: None,
//                 block_type: "vehicle_accessory".to_string(),
//                 lines: vec!["data_path: \"/added/path.sii\"".to_string()],
//                 status: "added".to_string(),
//             }],
//         })
//         .unwrap();

//         let updated = std::fs::read_to_string(&path).unwrap();
//         std::fs::remove_file(&path).unwrap();

//         assert!(updated.contains("vehicle_accessory : _nameless.qsg.0 {"));
//         assert!(updated.contains(" accessories[0]: _nameless.qsg.1"));
//         assert!(updated.contains("vehicle_accessory : _nameless.qsg.1 {"));
//         assert_eq!(updated.matches("_nameless.qsg.0 {").count(), 1);
//     }

//     #[test]
//     fn save_truck_accessories_request_deserializes_camel_case_payload() {
//         let request: SaveTruckAccessoriesRequest = serde_json::from_str(
//             r#"{
//                 "path": "save.sii",
//                 "truckId": ".truck",
//                 "changes": [
//                     {
//                         "id": ".accessory",
//                         "blockType": "vehicle_accessory",
//                         "lines": ["data_path: \"/path.sii\""],
//                         "status": "edited"
//                     }
//                 ]
//             }"#,
//         )
//         .unwrap();

//         assert_eq!(request.truck_id, ".truck");
//         assert_eq!(request.changes[0].block_type, "vehicle_accessory");
//     }

//     #[test]
//     fn save_truck_accessories_rejects_non_plaintext_files() {
//         let suffix = SystemTime::now()
//             .duration_since(UNIX_EPOCH)
//             .unwrap()
//             .as_nanos();
//         let path = std::env::temp_dir().join(format!(
//             "project_quicksave_save_truck_accessories_binary_{suffix}.sii"
//         ));
//         std::fs::write(&path, b"not-siin").unwrap();

//         let result = save_truck_accessories(SaveTruckAccessoriesRequest {
//             path: path.to_string_lossy().to_string(),
//             truck_id: ".truck".to_string(),
//             changes: Vec::new(),
//         });

//         std::fs::remove_file(&path).unwrap();

//         assert_eq!(
//             result.unwrap_err(),
//             "Saving truck accessories requires a plaintext SII file"
//         );
//     }

//     #[test]
//     fn get_player_vehicles_ignores_accessory_ids_with_non_truck_accessory_block_types() {
//         let suffix = SystemTime::now()
//             .duration_since(UNIX_EPOCH)
//             .unwrap()
//             .as_nanos();
//         let path = std::env::temp_dir().join(format!(
//             "project_quicksave_owned_truck_accessory_filter_{suffix}.sii"
//         ));

//         let content = r#"SiiNunit
// {
// player : .player {
//  trucks[0]: .truck
// }
// vehicle : .truck {
//  accessories[0]: .valid_accessory
//  accessories[1]: .invalid_accessory
// }
// vehicle_accessory : .valid_accessory {
//  data_path: "/def/vehicle/truck/volvo.fh16/data.sii"
// }
// job_offer_data : .invalid_accessory {
//  data_path: "/def/vehicle/truck/scania.r/data.sii"
// }
// }
// "#;

//         std::fs::write(&path, content).unwrap();

//         let vehicles = get_player_vehicles(path.to_string_lossy().to_string()).unwrap();

//         std::fs::remove_file(&path).unwrap();

//         let truck = vehicles.trucks.first().unwrap();
//         assert_eq!(truck.brand_id, "volvo.fh16");
//         assert_eq!(truck.display_name, "Volvo FH16 Classic");
//         assert_eq!(truck.accessories_count, 1);
//         assert_eq!(
//             truck.accessories[0].data_path,
//             "/def/vehicle/truck/volvo.fh16/data.sii"
//         );
//     }
// }