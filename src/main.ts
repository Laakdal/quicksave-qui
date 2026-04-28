import { invoke } from "@tauri-apps/api/core";

const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const loadingEl = document.getElementById("loading") as HTMLDivElement;
const previewContainer = document.getElementById("preview-container") as HTMLDivElement;
const previewContent = document.getElementById("preview-content") as HTMLPreElement;
const downloadBtn = document.getElementById("download-btn") as HTMLButtonElement;

let currentDecryptedText = "";
let currentFileName = "";

function setupDragAndDrop() {
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      handleFile(target.files[0]);
    }
  });
}

async function handleFile(file: File) {
  if (!file.name.endsWith(".sii")) {
    alert("Please select a valid .sii file.");
    return;
  }

  currentFileName = file.name;
  dropZone.style.display = "none";
  loadingEl.style.display = "flex";
  previewContainer.style.display = "none";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to regular array to safely pass to Rust Vec<u8>
    const data = Array.from(uint8Array);
    
    const decryptedText: string = await invoke("decode_sii", { data });
    
    currentDecryptedText = decryptedText;
    previewContent.textContent = decryptedText;
    
    loadingEl.style.display = "none";
    previewContainer.style.display = "flex";
    
  } catch (error) {
    console.error("Decryption failed:", error);
    alert(`Failed to decrypt file: ${error}`);
    
    // Reset UI
    dropZone.style.display = "flex";
    loadingEl.style.display = "none";
    fileInput.value = "";
  }
}

function setupDownload() {
  downloadBtn.addEventListener("click", () => {
    if (!currentDecryptedText) return;
    
    const blob = new Blob([currentDecryptedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFileName.replace(".sii", "_decrypted.sii");
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  setupDownload();
});
