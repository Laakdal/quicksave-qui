use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct TrailerAccessoryDetail {
    pub id: String,
    pub block_type: String,
    pub data_path: String,
    pub lines: Vec<String>,
}

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct TrailerDetail {
    pub id: String,
    pub display_name: String,
    pub license_plate: String,
    pub license_plate_line: String,
    pub damage_percent: Option<u8>,
    pub accessories: Vec<TrailerAccessoryDetail>,
    pub accessories_count: usize,
    pub slave_trailer: Option<String>,
    pub garage: String,
}

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct PlayerTrailers {
    pub trailers: Vec<TrailerDetail>,
    pub my_trailer: Option<String>,
    pub assigned_trailer: Option<String>,
}

fn extract_field_value(line: &str) -> Option<String> {
    let idx = line.find(':')?;
    Some(line[idx + 1..].trim().replace('"', ""))
}

fn clean_license_plate(plate: &str) -> String {
    let re_tags = Regex::new(r"<[^>]*>").unwrap();
    let cleaned = re_tags.replace_all(plate, "");

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

fn line_key(trimmed: &str) -> &str {
    trimmed.split(':').next().unwrap_or(trimmed).trim()
}

fn parse_hex_float_percent(line: &str) -> Option<u8> {
    let value = extract_field_value(line)?.trim_start_matches('&').to_string();
    let fraction = crate::hex::decode_f32_hex(&value).ok()?;
    Some((fraction.clamp(0.0, 1.0) * 100.0).round() as u8)
}

fn parse_damage_percent(lines: &[String]) -> Option<u8> {
    let mut values = Vec::new();

    for line in lines {
        let key = line_key(line.trim());
        if matches!(
            key,
            "trailer_body_wear"
                | "trailer_body_wear_unfixable"
                | "chassis_wear"
                | "chassis_wear_unfixable"
        ) || key.starts_with("wheels_wear[")
            || key.starts_with("wheels_wear_unfixable[")
        {
            if let Some(value) = parse_hex_float_percent(line) {
                values.push(value);
            }
        }
    }

    if values.is_empty() {
        None
    } else {
        Some((values.iter().map(|value| *value as usize).sum::<usize>() / values.len()) as u8)
    }
}

fn is_trailer_accessory_block_type(block_type: &str) -> bool {
    matches!(
        block_type,
        "vehicle_accessory"
            | "vehicle_addon_accessory"
            | "vehicle_wheel_accessory"
            | "vehicle_cargo_accessory"
            | "vehicle_paint_job_accessory"
    )
}

fn collect_accessories(
    trailer_id: &str,
    nameless_blocks: &HashMap<String, Vec<String>>,
    block_types: &HashMap<String, String>,
    detail: &mut TrailerDetail,
) {
    let Some(trailer_lines) = nameless_blocks.get(trailer_id) else {
        return;
    };

    let accessory_ids = trailer_lines
        .iter()
        .filter_map(|line| {
            if line.starts_with("accessories[") {
                extract_field_value(line)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    for accessory_id in accessory_ids {
        let Some(block_type) = block_types.get(&accessory_id) else {
            continue;
        };
        if !is_trailer_accessory_block_type(block_type) {
            continue;
        }
        let Some(accessory_lines) = nameless_blocks.get(&accessory_id) else {
            continue;
        };

        for accessory_line in accessory_lines {
            if accessory_line.starts_with("data_path:") {
                let data_path = extract_field_value(accessory_line).unwrap_or_default();
                detail.accessories.push(TrailerAccessoryDetail {
                    id: accessory_id.clone(),
                    block_type: block_type.clone(),
                    data_path: data_path.clone(),
                    lines: accessory_lines.clone(),
                });

                if detail.display_name.is_empty() && data_path.contains("/trailer") {
                    detail.display_name = data_path
                        .split('/')
                        .filter(|segment| !segment.is_empty())
                        .rev()
                        .nth(1)
                        .unwrap_or("Unknown Trailer")
                        .to_string();
                }
            }
        }
    }
}

fn parse_player_trailers_from_content(content: &str) -> Result<PlayerTrailers, String> {
    let mut trailers = PlayerTrailers::default();
    let mut nameless_blocks: HashMap<String, Vec<String>> = HashMap::new();
    let mut block_types: HashMap<String, String> = HashMap::new();
    let mut garage_map: HashMap<String, String> = HashMap::new();
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
            if current_block_type == "garage" {
                if let Some(lines) = nameless_blocks.get(&current_block_id) {
                    let garage_name = lines
                        .iter()
                        .find(|line| line.starts_with("garage_name:"))
                        .and_then(|line| extract_field_value(line))
                        .unwrap_or_else(|| current_block_id.clone());

                    for trailer_id in lines
                        .iter()
                        .filter(|line| line.starts_with("trailers["))
                        .filter_map(|line| extract_field_value(line))
                    {
                        if trailer_id != "null" {
                            garage_map.insert(trailer_id, garage_name.clone());
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

    if player_block_id.is_empty() {
        return Err("Player block not found".to_string());
    }

    let mut trailer_ids = Vec::new();
    if let Some(lines) = nameless_blocks.get(&player_block_id) {
        for line in lines {
            if line.starts_with("trailers[") {
                if let Some(value) = extract_field_value(line) {
                    trailer_ids.push(value);
                }
            } else if line.starts_with("my_trailer:") {
                let value = extract_field_value(line).unwrap_or_default();
                if value != "null" {
                    trailers.my_trailer = Some(value);
                }
            } else if line.starts_with("assigned_trailer:") {
                let value = extract_field_value(line).unwrap_or_default();
                if value != "null" {
                    trailers.assigned_trailer = Some(value);
                }
            }
        }
    }

    for trailer_id in trailer_ids {
        if !nameless_blocks.contains_key(&trailer_id) {
            continue;
        }

        let mut detail = TrailerDetail {
            id: trailer_id.clone(),
            garage: garage_map
                .get(&trailer_id)
                .cloned()
                .unwrap_or_else(|| "Unknown".to_string()),
            ..Default::default()
        };
        let trailer_lines = nameless_blocks.get(&trailer_id).unwrap();
        let slave_trailer = trailer_lines
            .iter()
            .find(|line| line.starts_with("slave_trailer:"))
            .and_then(|line| extract_field_value(line))
            .filter(|value| value != "null");
        if let Some(license_plate_line) = trailer_lines.iter().find(|line| line.starts_with("license_plate:")) {
            detail.license_plate_line = license_plate_line.clone();
            detail.license_plate = extract_field_value(license_plate_line)
                .map(|plate| clean_license_plate(&plate))
                .unwrap_or_default();
        }

        collect_accessories(&trailer_id, &nameless_blocks, &block_types, &mut detail);
        if let Some(slave_id) = &slave_trailer {
            collect_accessories(slave_id, &nameless_blocks, &block_types, &mut detail);
        }

        detail.slave_trailer = slave_trailer;
        detail.damage_percent = parse_damage_percent(trailer_lines);
        detail.accessories_count = detail.accessories.len();
        if detail.display_name.is_empty() {
            detail.display_name = trailer_id
                .split('.')
                .last()
                .unwrap_or("Unknown Trailer")
                .to_string();
        }

        trailers.trailers.push(detail);
    }

    Ok(trailers)
}

#[tauri::command]
pub fn get_player_trailers(path: String) -> Result<PlayerTrailers, String> {
    let data = std::fs::read(&path).map_err(|error| format!("Failed to read file: {error}"))?;
    let decoded = crate::sii::process(&data).map_err(|error| error.to_string())?;
    let content = String::from_utf8(decoded).map_err(|error| error.to_string())?;

    parse_player_trailers_from_content(&content)
}

fn render_active_trailer_content(content: &str, trailer_id: &str) -> Result<String, String> {
    let mut result = Vec::new();
    let mut in_player_block = false;
    let mut player_depth = 0usize;
    let mut found_player = false;
    let mut updated_my_trailer = false;
    let mut updated_assigned_trailer = false;

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

            if trimmed.starts_with("my_trailer:") {
                let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
                result.push(format!("{}my_trailer: {}", indent, trailer_id));
                updated_my_trailer = true;
                continue;
            }

            if trimmed.starts_with("assigned_trailer:") {
                let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
                result.push(format!("{}assigned_trailer: {}", indent, trailer_id));
                updated_assigned_trailer = true;
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
    if !updated_my_trailer {
        return Err("my_trailer line not found".to_string());
    }
    if !updated_assigned_trailer {
        return Err("assigned_trailer line not found".to_string());
    }

    Ok(result.join("\n"))
}

#[tauri::command]
pub fn save_active_trailer(path: String, trailer_id: String) -> Result<(), String> {
    let data = std::fs::read(&path).map_err(|error| format!("Failed to read file: {error}"))?;
    if !data.starts_with(b"SiiN") {
        return Err("Saving active trailer requires a plaintext SII file".to_string());
    }

    let content = String::from_utf8(data).map_err(|error| error.to_string())?;
    let rendered = render_active_trailer_content(&content, &trailer_id)?;
    std::fs::write(&path, rendered).map_err(|error| format!("Failed to write file: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_player_trailer_selection_fields() {
        let content = r#"
SiiNunit
{
player : _nameless.player {
 trailers[0]: _nameless.trailer.main
 my_trailer: _nameless.trailer.main
 assigned_trailer: _nameless.trailer.main
}
trailer : _nameless.trailer.main {
 accessories[0]: _nameless.accessory.body
 license_plate: "<offset hshift=2 vshift=1>ABC 123|sweden"
}
vehicle_accessory : _nameless.accessory.body {
 data_path: "/def/vehicle/trailer_owned/scs.box/body.sii"
}
}
"#;

        let trailers = parse_player_trailers_from_content(content).unwrap();

        assert_eq!(trailers.my_trailer.as_deref(), Some("_nameless.trailer.main"));
        assert_eq!(trailers.assigned_trailer.as_deref(), Some("_nameless.trailer.main"));
        assert_eq!(trailers.trailers.len(), 1);
        assert_eq!(trailers.trailers[0].license_plate, "ABC 123 | sweden");
        assert_eq!(trailers.trailers[0].accessories_count, 1);
    }

    #[test]
    fn parses_trailer_garage_from_garage_block() {
        let content = r#"
SiiNunit
{
player : _nameless.player {
 trailers[0]: _nameless.trailer.main
}
garage : garage.stockholm {
 garage_name: "stockholm"
 trailers[0]: _nameless.trailer.main
}
trailer : _nameless.trailer.main {
 accessories[0]: _nameless.accessory.body
}
vehicle_accessory : _nameless.accessory.body {
 data_path: "/def/vehicle/trailer_owned/scs.box/body.sii"
}
}
"#;

        let trailers = parse_player_trailers_from_content(content).unwrap();

        assert_eq!(trailers.trailers[0].garage, "stockholm");
    }

    #[test]
    fn renders_active_trailer_selection_in_player_block() {
        let content = r#"
SiiNunit
{
player : _nameless.player {
 my_trailer: _nameless.trailer.old
 assigned_trailer: _nameless.trailer.old
}
}
"#;

        let rendered = render_active_trailer_content(content, "_nameless.trailer.new").unwrap();

        assert!(rendered.contains(" my_trailer: _nameless.trailer.new"));
        assert!(rendered.contains(" assigned_trailer: _nameless.trailer.new"));
    }

    #[test]
    fn combines_slave_trailer_accessories_into_main_trailer() {
        let content = r#"
SiiNunit
{
player : _nameless.player {
 trailers[0]: _nameless.trailer.main
}
trailer : _nameless.trailer.main {
 accessories[0]: _nameless.accessory.front
 slave_trailer: _nameless.trailer.slave
}
trailer : _nameless.trailer.slave {
 accessories[0]: _nameless.accessory.rear
}
vehicle_accessory : _nameless.accessory.front {
 data_path: "/def/vehicle/trailer_owned/scs.box/front.sii"
}
vehicle_accessory : _nameless.accessory.rear {
 data_path: "/def/vehicle/trailer_owned/scs.box/rear.sii"
}
}
"#;

        let trailers = parse_player_trailers_from_content(content).unwrap();

        assert_eq!(trailers.trailers.len(), 1);
        assert_eq!(trailers.trailers[0].accessories_count, 2);
        assert!(trailers.trailers[0]
            .accessories
            .iter()
            .any(|accessory| accessory.id == "_nameless.accessory.front"));
        assert!(trailers.trailers[0]
            .accessories
            .iter()
            .any(|accessory| accessory.id == "_nameless.accessory.rear"));
    }
}
