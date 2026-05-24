const WEAR_FIELDS: &[&str] = &[
    "engine_wear",
    "transmission_wear",
    "cabin_wear",
    "engine_wear_unfixable",
    "transmission_wear_unfixable",
    "cabin_wear_unfixable",
    "chassis_wear",
    "chassis_wear_unfixable",
    "trailer_body_wear",
    "trailer_body_wear_unfixable",
    "wheels_wear",
    "wheels_wear_unfixable",
];

pub fn line_key(trimmed: &str) -> &str {
    trimmed.split(':').next().unwrap_or(trimmed).trim()
}

fn render_target_block_content(
    content: &str,
    vehicle_id: &str,
    mut render_line: impl FnMut(&str, &str) -> Option<String>,
) -> Result<String, String> {
    let mut result = Vec::new();
    let mut in_target_block = false;
    let mut target_depth = 0usize;
    let mut found_target = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.ends_with('{') && trimmed.contains(" : ") {
            let header = trimmed.trim_end_matches('{').trim();
            let id = header.split(':').nth(1).map(str::trim).unwrap_or_default();
            if id == vehicle_id {
                in_target_block = true;
                target_depth = 1;
                found_target = true;
            }
            result.push(line.to_string());
            continue;
        }

        if in_target_block {
            if trimmed.ends_with('{') {
                target_depth += 1;
            }

            let key = line_key(trimmed);
            if let Some(rendered) = render_line(line, key) {
                if !rendered.is_empty() {
                    result.push(rendered);
                }
                continue;
            }

            if trimmed == "}" {
                target_depth = target_depth.saturating_sub(1);
                if target_depth == 0 {
                    in_target_block = false;
                }
            }
        }

        result.push(line.to_string());
    }

    if !found_target {
        return Err("Vehicle block not found".to_string());
    }

    Ok(result.join("\n"))
}

fn render_repaired_owned_vehicle_content(content: &str, vehicle_id: &str) -> Result<String, String> {
    render_target_block_content(content, vehicle_id, |line, key| {
        if key.starts_with("wheels_wear[") || key.starts_with("wheels_wear_unfixable[") {
            return Some(String::new());
        }
        if WEAR_FIELDS.contains(&key) {
            let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
            return Some(format!("{}{}: 0", indent, key));
        }
        None
    })
}

fn render_refueled_truck_content(content: &str, vehicle_id: &str) -> Result<String, String> {
    render_target_block_content(content, vehicle_id, |line, key| {
        if key == "fuel_relative" {
            let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
            return Some(format!("{}fuel_relative: &3f800000", indent));
        }
        None
    })
}

fn render_license_plate_content(content: &str, vehicle_id: &str, license_plate_line: &str) -> Result<String, String> {
    render_target_block_content(content, vehicle_id, |line, key| {
        if key == "license_plate" {
            let indent = line.strip_suffix(line.trim_start()).unwrap_or("");
            return Some(format!("{}{}", indent, license_plate_line.trim()));
        }
        None
    })
}

fn read_plaintext_sii(path: &str, action: &str) -> Result<String, String> {
    let data = std::fs::read(path).map_err(|error| format!("Failed to read file: {error}"))?;
    if !data.starts_with(b"SiiN") {
        return Err(format!("{action} requires a plaintext SII file"));
    }

    String::from_utf8(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn repair_owned_vehicle(path: String, vehicle_id: String) -> Result<(), String> {
    let content = read_plaintext_sii(&path, "Repairing owned vehicles")?;
    let rendered = render_repaired_owned_vehicle_content(&content, &vehicle_id)?;
    std::fs::write(&path, rendered).map_err(|error| format!("Failed to write file: {error}"))
}

#[tauri::command]
pub fn refueling_truck(path: String, truck_id: String) -> Result<(), String> {
    let content = read_plaintext_sii(&path, "Refueling truck")?;
    let rendered = render_refueled_truck_content(&content, &truck_id)?;
    std::fs::write(&path, rendered).map_err(|error| format!("Failed to write file: {error}"))
}

#[tauri::command]
pub fn save_vehicle_license_plate(path: String, vehicle_id: String, license_plate_line: String) -> Result<(), String> {
    let content = read_plaintext_sii(&path, "Saving license plate")?;
    let rendered = render_license_plate_content(&content, &vehicle_id, &license_plate_line)?;
    std::fs::write(&path, rendered).map_err(|error| format!("Failed to write file: {error}"))
}

#[cfg(test)]
mod license_plate_tests {
    use super::*;

    #[test]
    fn replaces_selected_vehicle_license_plate_line() {
        let content = r#"
SiiNunit
{
vehicle : _nameless.truck.target {
 license_plate: "OLD 123|sweden"
}
vehicle : _nameless.truck.other {
 license_plate: "OTHER 456|norway"
}
}
"#;

        let rendered = render_license_plate_content(
            content,
            "_nameless.truck.target",
            "license_plate: \"NEW 789|denmark\"",
        )
        .unwrap();

        assert!(rendered.contains(" license_plate: \"NEW 789|denmark\""));
        assert!(rendered.contains(" license_plate: \"OTHER 456|norway\""));
        assert!(!rendered.contains("OLD 123"));
    }
}

#[cfg(test)]
mod refueling_tests {
    use super::*;

    #[test]
    fn refuels_selected_truck_to_full_hex_float() {
        let content = r#"
SiiNunit
{
vehicle : _nameless.truck.target {
 fuel_relative: &3ef37fe3
}
vehicle : _nameless.truck.other {
 fuel_relative: &3e800000
}
}
"#;

        let refueled = render_refueled_truck_content(content, "_nameless.truck.target").unwrap();

        assert!(refueled.contains(" fuel_relative: &3f800000"));
        assert!(refueled.contains(" fuel_relative: &3e800000"));
    }
}

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn repairs_truck_wear_fields_and_removes_wheel_entries() {
//         let content = r#"
// SiiNunit
// {
// vehicle : _nameless.truck {
//  engine_wear: &3b0bb046
//  transmission_wear: &3b0bb046
//  cabin_wear: &39203380
//  engine_wear_unfixable: &395f8079
//  transmission_wear_unfixable: &395f8079
//  cabin_wear_unfixable: &37002932
//  chassis_wear: &3948405e
//  chassis_wear_unfixable: &37203380
//  wheels_wear: 3
//  wheels_wear[0]: &3b0d90e0
//  wheels_wear[1]: &3b0d90e0
//  wheels_wear[2]: &3b0c0d20
//  wheels_wear_unfixable: 3
//  wheels_wear_unfixable[0]: &3caea05d
//  wheels_wear_unfixable[1]: &3caea05d
//  wheels_wear_unfixable[2]: &3cacbbad
// }
// }
// "#;

//         let repaired = render_repaired_owned_vehicle_content(content, "_nameless.truck").unwrap();

//         assert!(repaired.contains(" engine_wear: 0"));
//         assert!(repaired.contains(" transmission_wear: 0"));
//         assert!(repaired.contains(" cabin_wear: 0"));
//         assert!(repaired.contains(" engine_wear_unfixable: 0"));
//         assert!(repaired.contains(" transmission_wear_unfixable: 0"));
//         assert!(repaired.contains(" cabin_wear_unfixable: 0"));
//         assert!(repaired.contains(" chassis_wear: 0"));
//         assert!(repaired.contains(" chassis_wear_unfixable: 0"));
//         assert!(repaired.contains(" wheels_wear: 0"));
//         assert!(repaired.contains(" wheels_wear_unfixable: 0"));
//         assert!(!repaired.contains("wheels_wear["));
//         assert!(!repaired.contains("wheels_wear_unfixable["));
//     }

//     #[test]
//     fn repairs_trailer_wear_fields_and_removes_wheel_entries() {
//         let content = r#"
// SiiNunit
// {
// trailer : _nameless.trailer {
//  trailer_body_wear: &3c59e8d0
//  trailer_body_wear_unfixable: &3a2e53d9
//  chassis_wear: &3c883182
//  chassis_wear_unfixable: &3a59e8d0
//  wheels_wear: 2
//  wheels_wear[0]: &3c6f35aa
//  wheels_wear[1]: &3c6f35aa
//  wheels_wear_unfixable: 2
//  wheels_wear_unfixable[0]: &3df84795
//  wheels_wear_unfixable[1]: &3df84795
// }
// }
// "#;

//         let repaired = render_repaired_owned_vehicle_content(content, "_nameless.trailer").unwrap();

//         assert!(repaired.contains(" trailer_body_wear: 0"));
//         assert!(repaired.contains(" trailer_body_wear_unfixable: 0"));
//         assert!(repaired.contains(" chassis_wear: 0"));
//         assert!(repaired.contains(" chassis_wear_unfixable: 0"));
//         assert!(repaired.contains(" wheels_wear: 0"));
//         assert!(repaired.contains(" wheels_wear_unfixable: 0"));
//         assert!(!repaired.contains("wheels_wear["));
//         assert!(!repaired.contains("wheels_wear_unfixable["));
//     }
// }
