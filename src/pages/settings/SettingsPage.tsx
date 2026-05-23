import { useState, useEffect } from "react";
import { Sparkles, Paintbrush, Palette, Globe, Maximize, Save, HardDrive, Folder, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ColorPicker } from "../../components/ui/ColorPicker";
import { ToggleSwitch } from "../../components/ui/ToggleButton";
import { SelectDropdown } from "../../components/ui/DropdownBase";

interface SettingsViewProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  translucentEffect: boolean;
  onTranslucentEffectChange: (enabled: boolean) => void;
  initialTab?: string;
  onTabViewed?: () => void;
}

function SettingRow({ icon: Icon, title, desc, layout = "row", children }: { icon: React.ElementType; title: string; desc: string; layout?: "row" | "column"; children: React.ReactNode }) {
  if (layout === "column") {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-xl transition-colors duration-200" style={{ backgroundColor: 'rgb(var(--panel-dark))', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <Icon size={18} style={{ color: 'var(--text-secondary)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
          </div>
        </div>
        <div className="w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-xl transition-colors duration-200" style={{ backgroundColor: 'rgb(var(--panel-dark))', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-4">
        <Icon size={18} style={{ color: 'var(--text-secondary)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
        </div>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

export function SettingsView({ currentTheme, onThemeChange, translucentEffect, onTranslucentEffectChange, onTabViewed }: SettingsViewProps) {
  const [appTheme, setAppTheme] = useState(currentTheme);
  const [language, setLanguage] = useState("English");
  const [ets2Path, setEts2Path] = useState(() => localStorage.getItem("ets2_profiles_path") || "");
  const [atsPath, setAtsPath] = useState(() => localStorage.getItem("ats_profiles_path") || "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [disableMinSize, setDisableMinSize] = useState(() => localStorage.getItem("disable_min_window_size") === "true");
  const [showSaveConfirm, setShowSaveConfirm] = useState(() => localStorage.getItem("show_save_confirmation") !== "false");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [customAccent, setCustomAccent] = useState(() => localStorage.getItem('theme_accent_color') || '239 83 80');

  useEffect(() => {
    onTabViewed?.();
  }, [onTabViewed]);

  useEffect(() => {
    setAppTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', customAccent);
  }, [customAccent]);

  useEffect(() => {
    if (!ets2Path) {
      invoke<string | null>("auto_detect_profiles").then(detected => {
        if (detected) {
          setEts2Path(detected);
          localStorage.setItem("ets2_profiles_path", detected);
        }
      }).catch(err => console.error(err));
    }
  }, [ets2Path]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleThemeSelect = (val: string) => {
    setAppTheme(val);
    onThemeChange(val.toLowerCase());
  };

  const handleBrowse = async () => {
    try {
      const selected = await invoke<string | null>("pick_folder");
      if (selected) {
        setEts2Path(selected);
        localStorage.setItem("ets2_profiles_path", selected);
        setSaveSuccess(true);
      }
    } catch (err) {
      console.error("Dialog error:", err);
    }
  };

  const handleBrowseAts = async () => {
    try {
      const selected = await invoke<string | null>("pick_folder");
      if (selected) {
        setAtsPath(selected);
        localStorage.setItem("ats_profiles_path", selected);
        setSaveSuccess(true);
      }
    } catch (err) {
      console.error("Dialog error:", err);
    }
  };

  const handleDisableMinSize = (val: boolean) => {
    setDisableMinSize(val);
    localStorage.setItem("disable_min_window_size", val ? "true" : "false");
  };

  const handleShowSaveConfirm = (val: boolean) => {
    setShowSaveConfirm(val);
    localStorage.setItem("show_save_confirmation", val ? "true" : "false");
  };

  return (
    <div className="w-full h-full overflow-y-auto p-9">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h1 className="text-lg font-light mb-8" style={{ color: 'var(--text-primary)' }}>Settings</h1>

        <h2 className="text-base font-medium mb-4 mt-8" style={{ color: 'var(--text-primary)' }}>General Settings</h2>
        <div className="flex flex-col gap-2.5">
          <SettingRow icon={Globe} title="App Language" desc="Choose your preferred language for the interface.">
            <SelectDropdown value={language} options={["English", "Japanese", "Indonesian"]} onChange={setLanguage} />
          </SettingRow>

          <SettingRow icon={Maximize} title="Disable Minimum Window Size" desc="Allows you to resize the application window below its default limits.">
            <ToggleSwitch checked={disableMinSize} onChange={handleDisableMinSize} />
          </SettingRow>

          <SettingRow icon={Save} title="Show Save Confirmation" desc="Ask for confirmation before overwriting the original file.">
            <ToggleSwitch checked={showSaveConfirm} onChange={handleShowSaveConfirm} />
          </SettingRow>
        </div>

        <h2 className="text-base font-medium mb-4 mt-8" style={{ color: 'var(--text-primary)' }}>Personalization</h2>
        <div className="flex flex-col gap-2.5">
          <SettingRow icon={Sparkles} title="Translucent Effect (Windows 11)" desc="Apply the Windows 11 Mica translucent effect to the app window.">
            <ToggleSwitch checked={translucentEffect} onChange={onTranslucentEffectChange} />
          </SettingRow>

          <SettingRow icon={Paintbrush} title="Application theme" desc="Change the theme appearance">
            <SelectDropdown value={appTheme.charAt(0).toUpperCase() + appTheme.slice(1)} options={["Dark", "Light"]} onChange={handleThemeSelect} />
          </SettingRow>

          <SettingRow icon={Palette} title="Theme color" desc="Change the theme color">
            <div
              onClick={() => setIsColorPickerOpen(true)}
              className="w-12 h-6 rounded-md shadow-sm border border-black/10 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `rgb(${customAccent.split(' ').join(',')})` }}
            />
          </SettingRow>
        </div>

        <h2 className="text-base font-medium mb-4 mt-8" style={{ color: 'var(--text-primary)' }}>Data & Storage</h2>
        <div className="flex flex-col gap-2.5">
          <SettingRow icon={HardDrive} title="ETS2 Default Game Directory" desc="The root folder containing your game." layout="column">
            <div className="relative w-full">
              <input
                type="text"
                value={ets2Path}
                placeholder="Not set"
                onChange={(e) => setEts2Path(e.target.value)}
                onBlur={() => {
                  localStorage.setItem("ets2_profiles_path", ets2Path);
                  setSaveSuccess(true);
                }}
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm bg-black/20 border outline-none transition-all focus:border-accent/50"
                style={{ borderColor: saveSuccess ? 'var(--accent)' : 'var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleBrowse}
                title="Browse folder"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-white/10"
              >
                {saveSuccess ? <Check size={14} style={{ color: 'var(--accent)' }} /> : <Folder size={14} style={{ color: 'var(--text-secondary)' }} />}
              </button>
            </div>
          </SettingRow>

          <SettingRow icon={HardDrive} title="ATS Default Game Directory" desc="The root folder containing your game." layout="column">
            <div className="relative w-full">
              <input
                type="text"
                value={atsPath}
                placeholder="Not set"
                onChange={(e) => setAtsPath(e.target.value)}
                onBlur={() => {
                  localStorage.setItem("ats_profiles_path", atsPath);
                  setSaveSuccess(true);
                }}
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm bg-black/20 border outline-none transition-all focus:border-accent/50"
                style={{ borderColor: saveSuccess ? 'var(--accent)' : 'var(--border-subtle)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleBrowseAts}
                title="Browse folder"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-white/10"
              >
                {saveSuccess ? <Check size={14} style={{ color: 'var(--accent)' }} /> : <Folder size={14} style={{ color: 'var(--text-secondary)' }} />}
              </button>
            </div>
          </SettingRow>
        </div>

        <ColorPicker
          isOpen={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          initialColor={customAccent}
          onApply={(r, g, b) => {
            const newAccent = `${r} ${g} ${b}`;
            setCustomAccent(newAccent);
            localStorage.setItem('theme_accent_color', newAccent);
          }}
        />
      </div>
    </div>
  );
}
