import React, { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Sidebar } from "./components/layout/sidebar";
import {
  Menu, UploadCloud, FileJson, Download,
  Minus, Square, X
} from "lucide-react";

const appWindow = getCurrentWindow();

async function minimize() { await appWindow.minimize(); }
async function maximize() { await appWindow.toggleMaximize(); }
async function closeWin() { await appWindow.close(); }

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("decryptor");

  return (
    <div className="flex flex-col h-screen w-full text-zinc-100 overflow-hidden">

      {/* ── TITLEBAR ───────────────────────────────────────────────────── */}
      {/*
        CRITICAL: the drag region must be a dedicated child element.
        Putting data-tauri-drag-region on the <header> itself swallows
        all pointer events and makes buttons unclickable.
      */}
      <header className="relative flex items-center h-10 bg-[#18181b] border-b border-zinc-800 shrink-0 z-50">

        {/* Drag region: sits behind everything, fills the bar */}
        <div
          data-tauri-drag-region
          className="absolute inset-0"
        />

        {/* Left controls – rendered above the drag region */}
        <div className="relative flex items-center gap-2 pl-3 pr-4 z-10 pointer-events-auto">
          <button
            onClick={() => setIsSidebarOpen(o => !o)}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Toggle sidebar"
          >
            <Menu size={16} strokeWidth={1.5} />
          </button>

          {/* App icon + name */}
          <div className="flex items-center gap-2 ml-1 select-none pointer-events-none">
            <div className="flex items-center justify-center w-5 h-5 rounded bg-[#24c8db] text-black font-bold text-[11px]">
              Q
            </div>
            <span className="text-[13px] font-medium text-zinc-200">Project Quicksave</span>
          </div>
        </div>

        {/* Window controls – flush right, above drag region */}
        <div className="relative ml-auto flex items-stretch h-full z-10 pointer-events-auto">
          <button
            onClick={minimize}
            className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Minimize"
          >
            <Minus size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={maximize}
            className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Maximize"
          >
            <Square size={12} strokeWidth={1.5} />
          </button>
          <button
            onClick={closeWin}
            className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-[#e81123] hover:text-white"
            title="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden bg-[#202022]">
        <Sidebar
          isOpen={isSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
          {activeTab === "decryptor" ? (
            <DecryptorView />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <h2 className="text-lg font-medium text-zinc-300 capitalize">{activeTab}</h2>
              <p className="text-sm">This module is under construction.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Decryptor ─────────────────────────────────────────────────────────── */
function DecryptorView() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedText, setDecryptedText] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".sii")) { alert("Please select a valid .sii file."); return; }
    setFileName(file.name);
    setIsLoading(true);
    setDecryptedText("");
    try {
      const data = Array.from(new Uint8Array(await file.arrayBuffer()));
      const result = await invoke<string>("decode_sii", { data });
      setDecryptedText(result);
    } catch (e) {
      alert(`Failed to decrypt: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([decryptedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: fileName.replace(".sii", "_decrypted.sii"),
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading)
    return (
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-[#24c8db] rounded-full animate-spin" />
        <p className="font-medium text-sm">Decrypting save file…</p>
      </div>
    );

  if (decryptedText)
    return (
      <div className="flex flex-col w-full h-full p-5 gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-zinc-800/60 px-4 py-3 rounded-lg border border-zinc-700/50">
          <div className="flex items-center gap-3 text-zinc-200">
            <FileJson size={18} className="text-[#24c8db]" />
            <span className="font-medium text-sm">{fileName}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDecryptedText("")}
              className="px-3 py-1.5 text-xs rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24c8db] text-black hover:bg-[#1ba0b0] rounded-md text-xs font-semibold transition-colors"
            >
              <Download size={14} /> Save Decrypted
            </button>
          </div>
        </div>
        {/* Scrollable code view */}
        <div className="flex-1 bg-[#121214] rounded-lg border border-zinc-800 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <pre className="p-5 text-[13px] leading-relaxed text-zinc-300 font-mono">
              <code>{decryptedText}</code>
            </pre>
          </div>
        </div>
      </div>
    );

  return (
    <div
      className={`flex flex-col items-center justify-center w-full max-w-md m-8 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${isDragging
          ? "border-zinc-400 bg-zinc-800/50 scale-[1.02]"
          : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/20"
        }`}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <UploadCloud size={44} className="text-zinc-600 mb-5" />
      <h2 className="text-lg font-semibold text-zinc-200 mb-1">Select .sii file</h2>
      <p className="text-sm text-zinc-500 text-center leading-relaxed">
        Drag & drop your ETS2 / ATS save file here<br />or click to browse
      </p>
      <input type="file" accept=".sii" ref={fileInputRef}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden" />
    </div>
  );
}
