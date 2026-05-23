use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockedBlock {
    pub truck_id: String,
    pub block_type: String,
    pub original_block_id: String,
    pub body_lines: Vec<String>,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultFile {
    trucks: BTreeMap<String, Vec<LockedBlock>>,
}

#[tauri::command]
pub fn list_locked_blocks(truck_id: String) -> Result<Vec<LockedBlock>, String> {
    list_locked_blocks_at_path(default_vault_path(), truck_id)
}

#[tauri::command]
pub fn lock_block(
    truck_id: String,
    block_type: String,
    original_block_id: String,
    body_lines: Vec<String>,
) -> Result<LockedBlock, String> {
    lock_block_at_path(
        default_vault_path(),
        truck_id,
        block_type,
        original_block_id,
        body_lines,
    )
}

#[tauri::command]
pub fn unlock_block(truck_id: String, fingerprint: String) -> Result<(), String> {
    unlock_block_at_path(default_vault_path(), truck_id, fingerprint)
}

fn default_vault_path() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("quicksave-vault.json")
}

pub fn list_locked_blocks_at_path(
    path: impl AsRef<Path>,
    truck_id: String,
) -> Result<Vec<LockedBlock>, String> {
    let vault = read_vault(path)?;
    Ok(vault.trucks.get(&truck_id).cloned().unwrap_or_default())
}

pub fn lock_block_at_path(
    path: impl AsRef<Path>,
    truck_id: String,
    block_type: String,
    original_block_id: String,
    body_lines: Vec<String>,
) -> Result<LockedBlock, String> {
    let path = path.as_ref();
    let mut vault = read_vault(path)?;
    let fingerprint = compute_fingerprint(&block_type, &body_lines);
    let locked = LockedBlock {
        truck_id: truck_id.clone(),
        block_type,
        original_block_id,
        body_lines,
        fingerprint: fingerprint.clone(),
    };

    let truck_locks = vault.trucks.entry(truck_id).or_default();
    truck_locks.retain(|entry| entry.fingerprint != fingerprint);
    truck_locks.push(locked.clone());
    write_vault(path, &vault)?;

    Ok(locked)
}

pub fn unlock_block_at_path(
    path: impl AsRef<Path>,
    truck_id: String,
    fingerprint: String,
) -> Result<(), String> {
    let path = path.as_ref();
    let mut vault = read_vault(path)?;
    if let Some(truck_locks) = vault.trucks.get_mut(&truck_id) {
        truck_locks.retain(|entry| entry.fingerprint != fingerprint);
        if truck_locks.is_empty() {
            vault.trucks.remove(&truck_id);
        }
    }
    write_vault(path, &vault)
}

pub fn compute_fingerprint(block_type: &str, body_lines: &[String]) -> String {
    let mut normalized = Vec::with_capacity(body_lines.len() + 2);
    normalized.push(block_type.trim().to_ascii_lowercase());

    if let Some(data_path) = normalized_data_path(body_lines) {
        normalized.push(data_path);
    }

    normalized.extend(body_lines.iter().map(|line| normalize_body_line(line)));
    normalized.join("\n")
}

fn read_vault(path: impl AsRef<Path>) -> Result<VaultFile, String> {
    let path = path.as_ref();
    if !path.exists() {
        return Ok(VaultFile::default());
    }

    let contents = fs::read_to_string(path).map_err(|error| format!("Failed to read vault: {error}"))?;
    if contents.trim().is_empty() {
        return Ok(VaultFile::default());
    }

    serde_json::from_str(&contents).map_err(|error| format!("Failed to parse vault JSON: {error}"))
}

fn write_vault(path: impl AsRef<Path>, vault: &VaultFile) -> Result<(), String> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Failed to create vault directory: {error}"))?;
    }

    let contents = serde_json::to_string_pretty(vault)
        .map_err(|error| format!("Failed to serialize vault JSON: {error}"))?;
    fs::write(path, contents).map_err(|error| format!("Failed to write vault: {error}"))
}

fn normalized_data_path(body_lines: &[String]) -> Option<String> {
    body_lines.iter().find_map(|line| {
        let (key, value) = line.split_once(':')?;
        if key.trim() != "data_path" {
            return None;
        }
        Some(normalize_path(value))
    })
}

fn normalize_body_line(line: &str) -> String {
    let without_nameless = replace_nameless_ids(line);
    if let Some((key, value)) = without_nameless.split_once(':') {
        if key.trim() == "data_path" {
            return format!("data_path:{}", normalize_path(value));
        }
    }
    without_nameless.trim().to_ascii_lowercase()
}

fn normalize_path(value: &str) -> String {
    value
        .trim()
        .trim_matches('"')
        .replace('\\', "/")
        .trim_start_matches('/')
        .to_ascii_lowercase()
}

fn replace_nameless_ids(line: &str) -> String {
    line.split_whitespace()
        .map(|part| {
            let trimmed = part.trim_matches(|ch: char| ch == '{' || ch == '}' || ch == '"');
            if trimmed.starts_with("_nameless.") {
                part.replace(trimmed, "_nameless")
            } else {
                part.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

