import { useState, useEffect } from "react";
import { Settings, Palette, Database, Info, Folder, HardDrive, Check, ChevronDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const SETTINGS_TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data & Storage", icon: Database },
  { id: "about", label: "About", icon: Info },
];

interface SettingsViewProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  initialTab?: string;
  onTabViewed?: () => void;
}

export function SettingsView({ currentTheme, onThemeChange, initialTab, onTabViewed }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "general");
  const [ets2Path, setEts2Path] = useState(() => localStorage.getItem("game_profiles_path") || "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [disableMinSize, setDisableMinSize] = useState(() => localStorage.getItem("disable_min_window_size") === "true");
  const [showSaveConfirm, setShowSaveConfirm] = useState(() => localStorage.getItem("show_save_confirmation") !== "false");

  useEffect(() => {
    if (!ets2Path) {
      invoke<string | null>("auto_detect_profiles").then(detected => {
        if (detected) {
          setEts2Path(detected);
          localStorage.setItem("game_profiles_path", detected);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onTabViewed?.();
    }
  }, [initialTab]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleBrowse = async () => {
    try {
      const selected = await invoke<string | null>("pick_folder");

      if (selected) {
        let finalPath = selected;

        // Smart Detection: If they picked the parent folder, auto-append /profiles
        const lower = selected.toLowerCase();
        if (lower.endsWith("euro truck simulator 2") || lower.endsWith("american truck simulator")) {
          finalPath = `${selected}/profiles`;
        }

        setEts2Path(finalPath);
        localStorage.setItem("game_profiles_path", finalPath);
        setSaveSuccess(true);
      }
    } catch (err) {
      console.error("Dialog error:", err);
    }
  };

  const handleManualSave = (val: string) => {
    setEts2Path(val);
    localStorage.setItem("game_profiles_path", val);
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full overflow-hidden">

      {/* ── Settings Navigation ── */}
      <div
        className="w-full md:w-56 flex flex-row md:flex-col p-3 shrink-0 gap-1 overflow-x-auto md:overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border-subtle)',
          borderRight: 'none'
        }}
      >
        <h2 className="hidden md:block px-3 mb-2 text-[14px] font-semibold select-none" style={{ color: 'var(--text-sidebar-secondary)' }}>
          Settings
        </h2>

        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2 md:py-1.5 text-[13px] md:text-[14px] font-medium rounded-md transition-all duration-300 whitespace-nowrap ${isActive
                ? "bg-[#24c8db]/10"
                : "hover:bg-zinc-500/10"
                }`}
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-sidebar-secondary)'
              }}
            >
              <Icon size={16} className="shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col" style={{ backgroundColor: 'var(--bg-main)' }}>
        {activeTab === "general" && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* ── Hero Banner ── */}
            <div className="relative mb-6 rounded-xl overflow-hidden bg-[#24c8db]/20 border border-[#24c8db]/20 flex items-center justify-between p-5 gap-4">
              {/* Decorative background dots */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "radial-gradient(circle, #24c8db 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }} />
              <div className="relative">
                <p className="font-semibold text-[15px] text-white mb-1">Support the Project</p>
                <p className="text-sm text-zinc-300 mb-3">If this tool saved you time, consider starring the repo or contributing!</p>
                <a
                  href="https://github.com/Laakdal/quicksave-qui/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  ★ Star on GitHub
                </a>
              </div>
              {/* Icon badge with GIF */}
              <div className="relative flex-shrink-0 w-16 h-16 rounded-full bg-[#18181b] border border-zinc-700/50 flex items-center justify-center overflow-hidden select-none">
                <img
                  src="https://cdn.discordapp.com/attachments/514421293597196289/1498860989473362012/Sparxie_Laugh.gif?ex=69f2b293&is=69f16113&hm=b286b83e26e1a186fcc93668fd34e6c4a9e8bc721c29e46144c17671c9dd969e&"
                  alt="Truck"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>General Settings</h1>

            {/* Disable Minimum Window Size */}
            <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Disable Minimum Window Size</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Allows you to resize the application window below its default limits.</p>
              </div>
              {/* Toggle Switch */}
              <div
                onClick={() => {
                  const next = !disableMinSize;
                  setDisableMinSize(next);
                  localStorage.setItem("disable_min_window_size", next ? "true" : "false");
                }}
                className={`w-10 h-5 rounded-full flex items-center px-1 cursor-pointer transition-all duration-300 ${disableMinSize ? 'bg-[#24c8db]' : 'bg-zinc-700'}`}
              >
                <div className={`w-3.5 h-3.5 bg-black rounded-full shadow-sm transition-transform duration-300 ${disableMinSize ? 'translate-x-4.5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Show Save Confirmation */}
            <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Show Save Confirmation</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ask for confirmation before overwriting the original file.</p>
              </div>
              {/* Toggle Switch */}
              <div 
                onClick={() => {
                    const next = !showSaveConfirm;
                    setShowSaveConfirm(next);
                    localStorage.setItem("show_save_confirmation", next ? "true" : "false");
                }}
                className={`w-10 h-5 rounded-full flex items-center px-1 cursor-pointer transition-all duration-300 ${showSaveConfirm ? 'bg-[#24c8db]' : 'bg-zinc-700'}`}
              >
                <div className={`w-3.5 h-3.5 bg-black rounded-full shadow-sm transition-transform duration-300 ${showSaveConfirm ? 'translate-x-4.5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Language Selection */}
            <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>App Language</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Choose your preferred language for the interface.</p>
              </div>

              <div className="relative group">
                <select
                  className="appearance-none bg-black/20 border text-xs rounded-lg pl-3 pr-9 py-2 outline-none focus:border-[#24c8db] transition-all cursor-pointer hover:bg-black/30"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-main)' // Ensure the pop-out list has a background
                  }}
                >
                  <option value="en" className="bg-[#18181b] text-white">English (US)</option>
                  <option value="jp" className="bg-[#18181b] text-white">Japanese</option>
                  <option value="id" className="bg-[#18181b] text-white">Indonesian</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Appearance</h1>

            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3 uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-secondary)' }}>Theme Mode</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Dark Mode' },
                    { id: 'light', label: 'Light Mode' },
                    { id: 'hybrid', label: 'Hybrid' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                      className={`flex flex-col gap-3 p-4 rounded-xl border transition-all text-left ${currentTheme === t.id
                        ? 'border-[#24c8db] bg-[#24c8db]/5 ring-1 ring-[#24c8db]'
                        : ''
                        }`}
                      style={{
                        backgroundColor: currentTheme === t.id ? 'transparent' : 'var(--bg-sidebar)',
                        borderColor: currentTheme === t.id ? 'var(--accent)' : 'var(--border-subtle)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: currentTheme === t.id ? 'var(--accent)' : 'var(--text-primary)' }}>{t.label}</span>
                        {currentTheme === t.id && <div className="w-2 h-2 rounded-full bg-[#24c8db]" />}
                      </div>
                      <div className="flex gap-1">
                        <div className={`w-full h-1 rounded ${t.id === 'dark' || t.id === 'hybrid' ? 'bg-[#18181b]' : 'bg-zinc-200'}`} />
                        <div className={`w-full h-1 rounded ${t.id === 'dark' ? 'bg-[#202022]' : 'bg-white'}`} />
                      </div>
                    </button>
                  ))}
                </div>
                {currentTheme === 'hybrid' && (
                  <p className="mt-3 text-[12px] italic" style={{ color: 'var(--text-secondary)' }}>
                    * Hybrid mode keeps the sidebar dark while making the content area light.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Data & Storage</h1>

            <div className="space-y-6">
              {/* ETS2 Profiles Path */}
              <div className="p-5 rounded-xl border" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#24c8db]/10 flex items-center justify-center">
                    <HardDrive size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>ETS2 Default Game Directory</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>The root folder containing your game.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ets2Path}
                    onChange={(e) => {
                      setEts2Path(e.target.value);
                      localStorage.setItem("game_profiles_path", e.target.value);
                      setSaveSuccess(true);
                    }}
                    placeholder="C:\Users\...\Documents\Euro Truck Simulator 2"
                    className="flex-1 px-3 py-2 rounded-lg text-xs bg-black/20 border outline-none transition-all focus:border-[#24c8db]"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={handleBrowse}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#24c8db] text-black hover:bg-[#20b5c7] transition-all flex items-center gap-2"
                  >
                    <Folder size={14} />
                    Browse
                  </button>
                </div>

                {saveSuccess && (
                  <div className="mt-3 flex items-center gap-1.5 text-[#24c8db] animate-in fade-in slide-in-from-top-1">
                    <Check size={14} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Path Saved</span>
                  </div>
                )}
              </div>

              {/* ATS Profiles Path (Placeholder for consistency) */}
              <div className="p-5 rounded-xl border opacity-50 grayscale select-none" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-500/10 flex items-center justify-center">
                    <HardDrive size={20} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>ATS Profiles Directory (Coming Soon)</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>American Truck Simulator support is not yet implemented.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>About Project Quicksave</h1>
            <div
              className="p-4 rounded-xl border flex items-center gap-4 transition-colors duration-300"
              style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#24c8db]/10 text-[#24c8db] font-bold text-xl">
                Q
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Version 0.1.0 (Alpha)</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Powered by Tauri v2 + React 19 Engine</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Global Settings Footer ── */}
        <div className="mt-auto pt-8 pb-4">
          <p className="text-[10px] text-center opacity-40 tracking-[0.2em] select-none" style={{ color: 'var(--text-secondary)' }}>
            Copyright © 2026, poloroid. (formerly known as ArrowFx), Inc. All rights reserved.
          </p>
        </div>
      </div>

    </div>
  );
}
