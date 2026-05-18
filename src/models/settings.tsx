import { useState, useEffect, useRef } from "react";
import { Sparkles, Droplet, Paintbrush, Palette, ZoomIn, Globe, Eraser, ChevronDown, Maximize, Save, HardDrive, Folder, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface SettingsViewProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  translucentEffect: boolean;
  onTranslucentEffectChange: (enabled: boolean) => void;
  initialTab?: string;
  onTabViewed?: () => void;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{checked ? "On" : "Off"}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all duration-300 ${checked ? "bg-accent" : "bg-zinc-700"
          }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? "translate-x-4" : "translate-x-0"
            }`}
        />
      </div>
    </div>
  );
}

function SelectDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg pl-3 pr-8 py-1.5 text-sm bg-black/20 border outline-none focus:border-accent transition-all cursor-pointer"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-zinc-900 text-white">
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" style={{ color: "var(--text-secondary)" }} />
    </div>
  );
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

function hsvToRgb(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

function ColorPickerDialog({ isOpen, onClose, initialColor, onApply }: { isOpen: boolean; onClose: () => void; initialColor: string; onApply: (r: number, g: number, b: number) => void }) {
  const [hsv, setHsv] = useState([0, 1, 1]);
  const [initialHsv, setInitialHsv] = useState([0, 1, 1]);
  const [tempHex, setTempHex] = useState<string | null>(null);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialColor) {
      const parts = initialColor.split(' ').map(Number);
      if (parts.length === 3) {
        const val = rgbToHsv(parts[0], parts[1], parts[2]);
        setHsv(val);
        setInitialHsv(val);
      }
    }
  }, [isOpen, initialColor]);

  if (!isOpen) return null;

  const [r, g, b] = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  const derivedHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  const displayHex = tempHex !== null ? tempHex : derivedHex;

  const [initR, initG, initB] = hsvToRgb(initialHsv[0], initialHsv[1], initialHsv[2]);
  const initHex = "#" + ((1 << 24) + (initR << 16) + (initG << 8) + initB).toString(16).slice(1);

  const [baseR, baseG, baseB] = hsvToRgb(hsv[0], hsv[1], 1);
  const baseHex = "#" + ((1 << 24) + (baseR << 16) + (baseG << 8) + baseB).toString(16).slice(1);

  const updateSpectrum = (clientX: number, clientY: number) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));
    const newH = (x / rect.width) * 360;
    const newS = 1 - (y / rect.height);
    setHsv(prev => [newH, newS, prev[2]]);
    setTempHex(null);
  };

  const updateSlider = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const newV = x / rect.width;
    setHsv(prev => [prev[0], prev[1], newV]);
    setTempHex(null);
  };

  const handleSpectrumMouseDown = (e: React.MouseEvent) => {
    updateSpectrum(e.clientX, e.clientY);
    const onMouseMove = (moveEvent: MouseEvent) => updateSpectrum(moveEvent.clientX, moveEvent.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    updateSlider(e.clientX);
    const onMouseMove = (moveEvent: MouseEvent) => updateSlider(moveEvent.clientX);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const updateRgb = (type: 'r' | 'g' | 'b', value: number) => {
    let newR = r, newG = g, newB = b;
    if (type === 'r') newR = value;
    if (type === 'g') newG = value;
    if (type === 'b') newB = value;
    setHsv(rgbToHsv(newR, newG, newB));
    setTempHex(null);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempHex(val);

    const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(val);
    if (match) {
      let hexStr = match[1];
      if (hexStr.length === 3) {
        hexStr = hexStr.split('').map(c => c + c).join('');
      }
      const newR = parseInt(hexStr.slice(0, 2), 16);
      const newG = parseInt(hexStr.slice(2, 4), 16);
      const newB = parseInt(hexStr.slice(4, 6), 16);
      setHsv(rgbToHsv(newR, newG, newB));
    }
  };

  const handleHexBlur = () => {
    setTempHex(null);
  };

  // calculate thumb positions
  const thumbX = (hsv[0] / 360) * 100;
  const thumbY = (1 - hsv[1]) * 100;
  const sliderX = hsv[2] * 100;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-[380px] rounded-xl shadow-2xl overflow-hidden flex flex-col select-none" style={{ backgroundColor: '#282828', color: '#e3e3e3', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="p-6 pb-4">
          <h2 className="text-sm font-medium mb-5">Choose Theme color</h2>

          <div className="flex gap-3 mb-5">
            <div
              ref={spectrumRef}
              onMouseDown={handleSpectrumMouseDown}
              className="flex-1 h-40 rounded-md relative cursor-crosshair shadow-inner"
              style={{
                background: 'linear-gradient(to bottom, transparent, white), linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)'
              }}
            >
              <div
                className="absolute w-3.5 h-3.5 rounded-full border-[2.5px] border-black shadow-sm pointer-events-none"
                style={{ left: `${thumbX}%`, top: `${thumbY}%`, transform: 'translate(-50%, -50%)', backgroundColor: baseHex }}
              />
            </div>

            {/* Current/Old Color Preview */}
            <div className="w-8 h-40 rounded-md relative shadow-inner overflow-hidden flex flex-col">
              <div className="flex-1" style={{ backgroundColor: derivedHex }} />
              <div className="flex-1" style={{ backgroundColor: initHex }} />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/40 -translate-y-1/2" />
            </div>
          </div>

          <div
            ref={sliderRef}
            onMouseDown={handleSliderMouseDown}
            className="h-3 rounded-full relative mb-6 shadow-inner cursor-pointer"
            style={{ background: `linear-gradient(to right, black, ${baseHex})` }}
          >
            <div
              className="absolute top-1/2 w-4 h-4 rounded-full bg-white border border-black/20 shadow-sm pointer-events-none"
              style={{ left: `${sliderX}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          <div className="flex justify-between items-center mb-5">
            <span className="text-sm">Edit Color</span>
            <input
              type="text"
              value={displayHex}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              className="w-24 px-3 py-1 bg-black/20 rounded text-sm border border-white/5 text-center font-mono outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Red', type: 'r' as const, val: r },
              { label: 'Green', type: 'g' as const, val: g },
              { label: 'Blue', type: 'b' as const, val: b }
            ].map(color => (
              <div key={color.label} className="flex items-center gap-3">
                <input
                  type="number"
                  value={color.val}
                  onChange={(e) => updateRgb(color.type, Math.max(0, Math.min(255, Number(e.target.value))))}
                  className="w-24 px-3 py-1 bg-black/20 rounded text-sm border border-white/5 outline-none focus:border-accent/50 transition-colors"
                />
                <span className="text-sm opacity-80">{color.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 p-6 pt-2">
          <button
            onClick={() => { onApply(r, g, b); onClose(); }}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: derivedHex, color: (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000' : '#fff' }}
          >
            OK
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsView({ currentTheme, onThemeChange, translucentEffect, onTranslucentEffectChange, onTabViewed }: SettingsViewProps) {
  // UI Settings state
  const [colorizeBanner, setColorizeBanner] = useState(true);
  const [appTheme, setAppTheme] = useState(currentTheme);
  const [zoom, setZoom] = useState("Use system setting");
  const [language, setLanguage] = useState("English");

  // App Settings state
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
    if (customAccent) {
      document.documentElement.style.setProperty('--accent', customAccent);
    }
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

        {/* ── General Settings ── */}
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

        {/* ── Personalization ── */}
        <h2 className="text-base font-medium mb-4 mt-8" style={{ color: 'var(--text-primary)' }}>Personalization</h2>
        <div className="flex flex-col gap-2.5">
          <SettingRow icon={Sparkles} title="Translucent Effect (Windows 11)" desc="Apply the Windows 11 Mica translucent effect to the app window.">
            <ToggleSwitch checked={translucentEffect} onChange={onTranslucentEffectChange} />
          </SettingRow>

          {/* <SettingRow icon={Droplet} title="Colorize home banner" desc="Dynamic or static color for home top banner (affect performance)">
            <ToggleSwitch checked={colorizeBanner} onChange={setColorizeBanner} />
          </SettingRow> */}

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

          {/* <SettingRow icon={ZoomIn} title="Interface zoom" desc="Change the size of widgets and fonts">
            <SelectDropdown value={zoom} options={["Use system setting", "100%", "125%", "150%"]} onChange={setZoom} />
          </SettingRow> */}
        </div>

        {/* ── Data & Storage ── */}
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

          {/* <SettingRow icon={Eraser} title="Reset app" desc="Delete all tools files and app config">
            <button className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-white/10" style={{ backgroundColor: 'rgba(var(--zinc-700), 0.5)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              Reset app
            </button>
          </SettingRow> */}
        </div>

        <ColorPickerDialog
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
