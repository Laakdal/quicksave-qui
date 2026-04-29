import { useState, useRef, useEffect } from "react";
import { ChevronDown, RotateCw, Folder, HardDrive, AlertCircle, User } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

/* ── Types ──────────────────────────────────────────────────────── */

interface SaveProfile {
    id: string;    // The folder name (hex)
    name: string;  // The actual profile name
    path: string;  // Full path to the profile folder
}

const DEFAULT_PATH = "C:\\Users\\%USERNAME%\\Documents\\Euro Truck Simulator 2\\profiles";

/* ── SaveManagerView ────────────────────────────────────────────── */

interface SaveManagerProps {
    onNavigate?: () => void;
}

export function SaveManagerView({ onNavigate }: SaveManagerProps) {
    const [profiles, setProfiles] = useState<SaveProfile[]>([]);
    const [activeId, setActiveId] = useState<string>(() => localStorage.getItem("active_save_profile") || "");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        refreshProfiles();
        
        const handleSync = () => {
            const newActive = localStorage.getItem("active_save_profile");
            if (newActive) setActiveId(newActive);
        };
        window.addEventListener("profile-changed", handleSync);
        return () => window.removeEventListener("profile-changed", handleSync);
    }, []);

    const refreshProfiles = async () => {
        setIsReloading(true);
        setError(null);
        try {
            let path = localStorage.getItem("game_profiles_path");
            
            // Auto-detect if no path is stored
            if (!path) {
                const detected = await invoke<string | null>("auto_detect_profiles");
                if (detected) {
                    path = detected;
                    localStorage.setItem("game_profiles_path", detected);
                } else {
                    path = DEFAULT_PATH;
                }
            }
            
            const gameProfiles = await invoke<SaveProfile[]>("get_game_profiles", { path });
            setProfiles(gameProfiles);
            
            if (!activeId && gameProfiles.length > 0) {
                setActiveId(gameProfiles[0].id);
                localStorage.setItem("active_save_profile", gameProfiles[0].id);
            }
        } catch (err) {
            console.error("Failed to load profiles:", err);
            setError(String(err));
        } finally {
            setTimeout(() => setIsReloading(false), 500);
        }
    };

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

                localStorage.setItem("game_profiles_path", finalPath);
                refreshProfiles();
            }
        } catch (err) {
            console.error("Dialog error:", err);
        }
    };

    const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];

    // Close dropdown on outside click
    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleOutside);
            return () => document.removeEventListener("mousedown", handleOutside);
        }
    }, [isDropdownOpen]);

    const switchProfile = (id: string) => {
        setActiveId(id);
        localStorage.setItem("active_save_profile", id);
        window.dispatchEvent(new Event("profile-changed"));
        setIsDropdownOpen(false);
    };

    const handleReload = () => {
        refreshProfiles();
    };

    return (
        <div className="flex flex-col w-full h-full">
            {/* ── Top Bar ── */}
            <div
                className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
                {/* Profile Selector Dropdown */}
                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={profiles.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all duration-200 hover:bg-zinc-500/10 max-w-[320px] disabled:opacity-40"
                        style={{
                            color: 'white',
                            borderColor: 'var(--border-subtle)',
                            backgroundColor: 'transparent',
                        }}
                    >
                        <HardDrive size={14} className="text-[#24c8db] shrink-0" />
                        <span className="truncate">{activeProfile?.name || "No Profiles Found"}</span>
                        <ChevronDown
                            size={14}
                            className="shrink-0 transition-transform duration-200 text-white/70"
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div
                            className="absolute right-0 top-full mt-1 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[280px] animate-in fade-in slide-in-from-top-1 duration-150"
                            style={{
                                backgroundColor: 'var(--bg-main)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div className="p-1.5">
                                <p
                                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Profiles
                                </p>
                                {profiles.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => switchProfile(p.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${p.id === activeId
                                            ? 'bg-[#24c8db]/10'
                                            : 'hover:bg-zinc-500/10'
                                            }`}
                                    >
                                        <User
                                            size={15}
                                            className="shrink-0"
                                            style={{ color: p.id === activeId ? 'var(--accent)' : 'var(--text-secondary)' }}
                                        />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span
                                                className="text-sm font-medium truncate"
                                                style={{ color: p.id === activeId ? 'var(--accent)' : 'var(--text-primary)' }}
                                            >
                                                {p.name}
                                            </span>
                                            <span
                                                className="text-[11px] truncate"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {p.id}
                                            </span>
                                        </div>
                                        {p.id === activeId && (
                                            <div className="w-2 h-2 rounded-full bg-[#24c8db] shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Reload Button */}
                <button
                    onClick={handleReload}
                    disabled={isReloading}
                    className="p-2 rounded-lg border transition-all duration-200 hover:bg-zinc-500/10 disabled:opacity-40"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'white',
                    }}
                    title="Reload saves"
                >
                    <RotateCw
                        size={14}
                        className={`transition-transform ${isReloading ? 'animate-spin' : ''}`}
                    />
                </button>
            </div>

            {/* ── Content Area ── */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 overflow-auto p-6 text-center">
                {error ? (
                    <>
                        <AlertCircle size={40} className="text-red-500/50 mb-2" />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Profile Path Error</p>
                        <p className="text-xs max-w-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
                            Could not find profiles at:<br/>
                            <code className="bg-black/20 px-1 rounded mt-1 inline-block">{DEFAULT_PATH}</code>
                        </p>
                        <div className="flex gap-2 mt-4">
                            <button 
                                onClick={handleBrowse}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#24c8db] text-black hover:bg-[#20b5c7] transition-colors shadow-lg shadow-[#24c8db]/20"
                            >
                                Browse Folder
                            </button>
                            <button 
                                onClick={onNavigate}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-500/10 hover:bg-zinc-500/20 transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Settings
                            </button>
                        </div>
                    </>
                ) : profiles.length === 0 ? (
                    <>
                        <HardDrive size={40} className="opacity-20 mb-2" style={{ color: 'var(--text-primary)' }} />
                        <p className="text-sm font-medium opacity-60" style={{ color: 'var(--text-primary)' }}>No Profiles Detected</p>
                        <p className="text-xs opacity-40" style={{ color: 'var(--text-secondary)' }}>
                            Make sure your ETS2 profiles directory is correct.
                        </p>
                    </>
                ) : (
                    <>
                        <Folder size={40} className="opacity-20 mb-2" style={{ color: 'var(--text-primary)' }} />
                        <p className="text-sm font-medium opacity-60" style={{ color: 'var(--text-primary)' }}>{activeProfile?.name}</p>
                        <p className="text-xs opacity-40" style={{ color: 'var(--text-secondary)' }}>
                            Selected profile: {activeId}<br/>
                            Scan for save files to continue.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
