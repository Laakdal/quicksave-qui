import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { UploadCloud, FileJson, Download, ToggleLeft, ToggleRight } from "lucide-react";
import Editor from "@monaco-editor/react";

export function DecryptorView() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedText, setDecryptedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [useMonaco, setUseMonaco] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tauri native file-drop listener ─────────────────────────────────────
  // Tauri intercepts drag-and-drop at the OS level, so the browser's onDrop
  // event never fires. We must use the Tauri window event API instead.
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const unlisten = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragging(true);
      } else if (event.payload.type === "drop") {
        setIsDragging(false);
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          handleFilePath(paths[0]);
        }
      } else {
        setIsDragging(false);
      }
    });

    // Clean up listener when component unmounts
    return () => { unlisten.then(f => f()); };
  }, []);

  // Reads a file from an absolute path string (Tauri drag-drop gives us paths)
  const handleFilePath = async (path: string) => {
    const name = path.split(/[\\/]/).pop() ?? path;
    if (!name.endsWith(".sii")) {
      alert("Please select a valid .sii file.");
      return;
    }

    setFileName(name);
    setIsLoading(true);
    setDecryptedText("");

    try {
      const result = await invoke<string>("decode_sii_path", { path });
      setDecryptedText(result);
    } catch {
      // Fallback: if the Rust command doesn't accept a path yet,
      // try reading the file via the browser File API (click-to-open)
      alert(`Could not read file at: ${path}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reads a File object (from the click-to-browse input)
  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".sii")) {
      alert("Please select a valid .sii file.");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setDecryptedText("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const data = Array.from(uint8Array);
      const result = await invoke<string>("decode_sii", { data });
      setDecryptedText(result);
    } catch (error) {
      console.error("Decryption failed:", error);
      alert(`Failed to decrypt file: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = () => {
    if (!decryptedText) return;
    const blob = new Blob([decryptedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(".sii", "_decrypted.sii");
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render states ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-zinc-400">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-[#24c8db] rounded-full animate-spin" />
        <p className="font-medium text-sm">Decrypting save file…</p>
      </div>
    );
  }

  if (decryptedText) {
    return (
      <div className="flex flex-col w-full h-full p-5 gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-zinc-800/60 px-4 py-3 rounded-lg border border-zinc-700/50">
          <div className="flex items-center gap-3 text-zinc-200">
            <FileJson size={18} className="text-[#24c8db]" />
            <span className="font-medium text-sm">{fileName}</span>
          </div>
          <div className="flex gap-2 items-center">
            {/* Editor Toggle */}
            <button
              onClick={() => setUseMonaco(!useMonaco)}
              className="flex items-center gap-2 px-3 py-1.5 mr-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            >
              {useMonaco ? <ToggleRight size={18} className="text-[#24c8db]" /> : <ToggleLeft size={18} />}
              VS Code Mode
            </button>

            <button
              onClick={() => { setDecryptedText(""); }}
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

        {/* Code View Area */}
        {useMonaco ? (
          <div className="flex-1 rounded-lg border border-zinc-800 overflow-hidden relative shadow-inner">
            <Editor
              height="100%"
              defaultLanguage="ini"
              theme="vs-dark"
              value={decryptedText}
              onChange={(value) => setDecryptedText(value || "")}
              options={{
                readOnly: false,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 13,
                wordWrap: "off",
                padding: { top: 16 },
                // Disable the hover tooltip popups on editor widgets
                hover: { enabled: false },
              }}
              loading={<div className="flex justify-center pt-10 text-zinc-500">Loading editor...</div>}
            />
          </div>
        ) : (
          <div className="flex-1 bg-[#121214] rounded-lg border border-zinc-800 overflow-hidden relative">
            <div className="absolute inset-0 overflow-auto">
              <pre className="p-5 text-[13px] leading-relaxed text-zinc-300 font-mono">
                <code>{decryptedText}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Drop zone (default view) ─────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className={`flex flex-col items-center justify-center w-full max-w-md p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-[#24c8db] bg-[#24c8db]/10 scale-[1.02]"
            : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/20"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={44} className={`mb-5 transition-colors ${isDragging ? "text-[#24c8db]" : "text-zinc-600"}`} />
        <h2 className="text-lg font-semibold text-zinc-200 mb-1">
          {isDragging ? "Release to decrypt" : "Select .sii file"}
        </h2>
        <p className="text-sm text-zinc-500 text-center leading-relaxed">
          Drag & drop your ETS2 / ATS save file here<br />or click to browse
        </p>
        <input
          type="file"
          accept=".sii"
          ref={fileInputRef}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
      </div>
    </div>
  );
}
