import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { UploadCloud, FileJson, Download, History, Trash2, Clock, X, Folder, Save, AlertTriangle, Check, Zap } from "lucide-react";
import { CodeViewer } from "../../components/ui/CodeViewer";

/* ── Types ──────────────────────────────────────────────────────── */

interface HistoryItem {
  id: string;
  name: string;
  path: string;
  timestamp: number;
}

interface DecryptorConfig {
  instant_mode: boolean;
  history: HistoryItem[];
}

interface DecryptResult {
  decrypted_text: string | null;
  file_name: string;
  file_path: string;
  is_instant: boolean;
}

/* ── DecryptorView ─────────────────────────────────────────────── */

export function DecryptorView() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedText, setDecryptedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentFilePath, setCurrentFilePath] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Settings / Modes
  const [isInstantMode, setIsInstantMode] = useState(false);
  const [isHoveringInstant, setIsHoveringInstant] = useState(false);

  // Use a ref for instant mode to avoid stale closures in the event listener
  const instantModeRef = useRef(isInstantMode);
  useEffect(() => {
    instantModeRef.current = isInstantMode;
  }, [isInstantMode]);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState("");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // ── Load Decryptor Config from Rust Backend ──
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await invoke<DecryptorConfig>("get_decryptor_config");
        setIsInstantMode(config.instant_mode);
        setHistory(config.history);
      } catch (e) {
        console.error("Failed to load decryptor config from Rust backend:", e);
      }
    };
    loadConfig();
  }, []);

  const refreshConfig = async () => {
    try {
      const config = await invoke<DecryptorConfig>("get_decryptor_config");
      setIsInstantMode(config.instant_mode);
      setHistory(config.history);
    } catch (e) {
      console.error("Failed to refresh decryptor config:", e);
    }
  };

  // ── Tauri native file-drop listener ──
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

    return () => { unlisten.then(f => f()); };
  }, []);

  const clearHistory = async () => {
    setHistory([]);
    try {
      await invoke("clear_decryptor_history");
    } catch (e) {
      console.error("Failed to clear decryptor history:", e);
    }
  };

  const removeHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter(item => item.id !== id));
    try {
      await invoke("remove_decryptor_history_item", { id });
    } catch (e) {
      console.error("Failed to remove decryptor history item:", e);
    }
  };

  const handleFilePath = async (path: string) => {
    const name = path.split(/[\\/]/).pop() ?? path;
    if (!name.endsWith(".sii")) {
      alert("Please select a valid .sii file.");
      return;
    }

    setFileName(name);
    setCurrentFilePath(path);
    setIsLoading(true);
    setDecryptedText("");

    try {
      const result = await invoke<DecryptResult>("decrypt_sii_file", { 
        path, 
        instantMode: instantModeRef.current 
      });

      if (result.is_instant) {
        setLastSavedPath(path);
        setShowSuccessModal(true);
        setIsLoading(false);
      } else {
        setDecryptedText(result.decrypted_text ?? "");
        setIsLoading(false);
      }
      await refreshConfig();
    } catch (err) {
      alert(`Could not decrypt file: ${err}`);
      setIsLoading(false);
    }
  };

  const executeSaveToOriginal = async () => {
    if (!decryptedText || !currentFilePath) return;
    try {
      await invoke("write_file", { path: currentFilePath, contents: decryptedText });
      setShowConfirmModal(false);
      setLastSavedPath(currentFilePath);
      setShowSuccessModal(true);
      if (dontShowAgain) {
        localStorage.setItem("show_save_confirmation", "false");
      }
    } catch (err) {
      alert(`Failed to save file: ${err}`);
    }
  };

  const handleSaveToOriginalClick = () => {
    const shouldShow = localStorage.getItem("show_save_confirmation") !== "false";
    if (shouldShow) {
      setShowConfirmModal(true);
    } else {
      executeSaveToOriginal();
    }
  };

  const saveAs = async () => {
    if (!decryptedText) return;
    try {
      const path = await invoke<string | null>("save_file_dialog", {
        defaultName: fileName.replace(".sii", "_decrypted.sii")
      });
      if (path) {
        await invoke("write_file", { path, contents: decryptedText });
        setLastSavedPath(path);
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleBrowseClick = async () => {
    try {
      const path = await invoke<string | null>("pick_file");
      if (path) {
        handleFilePath(path);
      }
    } catch (err) {
      console.error("File dialog error:", err);
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Auto-hide success modal
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const toggleInstantMode = async () => {
    const nextMode = !isInstantMode;
    setIsInstantMode(nextMode);
    try {
      await invoke("save_decryptor_config", {
        config: {
          instant_mode: nextMode,
          history: history,
        }
      });
    } catch (e) {
      console.error("Failed to save instant mode to Rust backend:", e);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-zinc-400">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-accent rounded-full animate-spin" />
        <p className="font-medium text-sm">Decrypting save file…</p>
      </div>
    );
  }

  if (decryptedText && !isInstantMode) {
    return (
      <div className="flex flex-col w-full h-full p-5 gap-3">
        {/* Modal Overlay */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-panel-dark border border-zinc-800 rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4 text-[#ffb800]">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold text-white">Confirm Overwrite</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                This will decrypt and overwrite the original file at:<br />
                <span className="text-zinc-200 font-mono text-micro block mt-2 p-2 bg-black/30 rounded border border-zinc-800/50 break-all">
                  {currentFilePath}
                </span>
              </p>

              <div className="flex items-center gap-2 mb-6 cursor-pointer select-none group" onClick={() => setDontShowAgain(!dontShowAgain)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-accent border-accent' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                  {dontShowAgain && <X size={12} className="text-black" />}
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">Don't show this again</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSaveToOriginal}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#ef4444] text-white hover:bg-[#dc2626] transition-all shadow-lg shadow-red-500/10"
                >
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-zinc-800/60 px-4 py-3 rounded-lg border border-zinc-700/50">
          <div className="flex items-center gap-3 text-zinc-200 min-w-0 flex-1 pr-4">
            <FileJson size={18} className="text-accent shrink-0" />
            <span className="font-medium text-sm truncate">{fileName}</span>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <button
              onClick={() => { setDecryptedText(""); }}
              className="px-3 py-1.5 text-xs rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={saveAs}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-semibold transition-colors"
            >
              <Download size={14} /> Save As...
            </button>
            <button
              onClick={handleSaveToOriginalClick}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-black hover:bg-accent-hover rounded-md text-xs font-bold transition-colors"
            >
              <Save size={14} /> Save Decrypted
            </button>
          </div>
        </div>

        <CodeViewer value={decryptedText} onChange={setDecryptedText} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full h-full p-8 pt-16 overflow-auto custom-scrollbar">

      {/* Success Notification (Bottom Right) */}
      {showSuccessModal && (
        <div className="fixed bottom-6 right-6 z-[110] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-panel-dark border border-accent/30 rounded-xl p-4 shadow-2xl flex items-center gap-4 min-w-[300px] max-w-md">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <Check size={20} />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>File Saved Successfully</h3>
              <p className="text-2xs truncate opacity-60" style={{ color: 'var(--text-secondary)' }}>
                {lastSavedPath}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl py-6">
        <div className="flex items-center justify-end mb-3">
          <div className="relative">
            <button
              onMouseEnter={() => setIsHoveringInstant(true)}
              onMouseLeave={() => setIsHoveringInstant(false)}
              onClick={toggleInstantMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-2xs font-bold uppercase tracking-wider transition-all duration-300 border ${isInstantMode
                  ? 'bg-accent/10 border-accent/50 text-accent'
                  : 'bg-black/5 border-black/10 hover:bg-black/10'
                }`}
              style={{ 
                color: isInstantMode ? 'var(--accent)' : 'var(--text-secondary)',
                borderColor: isInstantMode ? 'rgba(var(--accent) / 0.5)' : 'var(--border-subtle)'
              }}
            >
              <Zap size={12} className={isInstantMode ? 'fill-accent' : ''} />
              Instant Mode: {isInstantMode ? 'ON' : 'OFF'}
            </button>

            {isHoveringInstant && (
              <div className="absolute right-0 top-full mt-2 w-48 z-50 p-3 bg-panel-dark border border-zinc-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                <p className="text-xs leading-relaxed text-zinc-400">
                  <span className="text-accent font-bold block mb-1">Instant Mode</span>
                  Instantly decrypts and overwrites original files upon dropping them into the zone.
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex flex-col items-center justify-center w-full p-16 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${isDragging
            ? "border-accent bg-accent/10 scale-[1.01]"
            : "border-black/5 hover:border-accent/50 hover:bg-black/5"
            }`}
          style={{ borderColor: isDragging ? 'var(--accent)' : 'var(--border-subtle)' }}
          onClick={handleBrowseClick}
        >
          <UploadCloud size={56} className={`mb-6 transition-colors ${isDragging ? "text-accent" : "opacity-20"}`} style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {isDragging ? "Release to decrypt" : "Select .sii file"}
          </h2>
          <p className="text-center leading-relaxed opacity-60" style={{ color: 'var(--text-secondary)' }}>
            Drag & drop your ETS2 / ATS save file here<br />or click to browse
          </p>
        </div>
      </div>

      {history && history.length > 0 && (
        <div className="w-full max-w-2xl mt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <History size={20} className="text-accent" />
              Recent Activity
            </h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all uppercase tracking-wider"
            >
              <Trash2 size={12} />
              Clear All
            </button>
          </div>

          <div className="space-y-2 pb-10">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleFilePath(item.path)}
                className="group flex items-center gap-4 p-4 border rounded-xl transition-all cursor-pointer active:scale-[0.98] bg-black/5 hover:bg-accent/5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-black/5">
                  <FileJson size={20} className="text-accent/70" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    <span className="text-2xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 bg-black/5" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={10} /> {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs truncate opacity-60" style={{ color: 'var(--text-secondary)' }}>
                    <Folder size={12} className="shrink-0 opacity-40" />
                    <span className="truncate">{item.path}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center px-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(e, item.id);
                    }}
                    className="p-2.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-all opacity-0 group-hover:opacity-100"
                    title="Remove from history"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
