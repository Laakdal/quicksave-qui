import { useState, useRef, useEffect } from "react";
import {
    ChevronDown,
    RotateCw,
    Folder,
    HardDrive,
    AlertCircle,
    User,
    LayoutDashboard,
    Truck,
    Briefcase,
    Check,
    Wallet,
    Save as SaveIcon,
    Coins
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

/* ── Types ──────────────────────────────────────────────────────── */

interface SaveProfile {
    id: string;
    name: string;
    path: string;
}

interface GameSave {
    id: string;
    name: string;
    path: string;
}

const DEFAULT_PATH = "C:\\Users\\%USERNAME%\\Documents\\Euro Truck Simulator 2\\profiles";

const SAVE_TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profile", label: "Profile", icon: User, subItems: ["Money", "EXP", "Skill", "Company"] },
    { id: "truck", label: "Truck", icon: Truck },
    { id: "trailer", label: "Trailer", icon: Briefcase },
];

/* ── SaveManagerView ────────────────────────────────────────────── */

interface SaveManagerProps {
    onNavigate?: () => void;
}

export function SaveManagerView({ onNavigate }: SaveManagerProps) {
    const [activeSubTab, setActiveSubTab] = useState("overview");
    const [profiles, setProfiles] = useState<SaveProfile[]>([]);
    const [activeId, setActiveId] = useState<string>(() => localStorage.getItem("active_save_profile") || "");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const saveDropdownRef = useRef<HTMLDivElement>(null);

    // Profile/Saves State
    const [saves, setSaves] = useState<GameSave[]>([]);
    const [activeSaveId, setActiveSaveId] = useState<string>("");
    const [isSavesDropdownOpen, setIsSavesDropdownOpen] = useState(false);
    const [money, setMoney] = useState<string>("0");
    const [exp, setExp] = useState<string>("0");
    const [skills, setSkills] = useState({
        adr: "0",
        long_dist: "0",
        heavy: "0",
        fragile: "0",
        urgent: "0",
        mechanical: "0"
    });
    const [isModifying, setIsModifying] = useState(false);
    const [lastSaved, setLastSaved] = useState<number>(0);

    const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];
    const activeSave = saves.find(s => s.id === activeSaveId);

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

    // Load saves when profile changes
    useEffect(() => {
        if (activeId && activeProfile) {
            loadSaves();
        }
    }, [activeId, activeProfile]);

    const refreshProfiles = async () => {
        setIsReloading(true);
        setError(null);
        try {
            let path = localStorage.getItem("game_profiles_path");
            if (!path) {
                const detected = await invoke<string | null>("auto_detect_profiles");
                if (detected) {
                    path = detected;
                    localStorage.setItem("game_profiles_path", detected);
                } else {
                    path = DEFAULT_PATH;
                }
            }
            const gameProfiles = await invoke<SaveProfile[]>("get_game_profiles", {
                path: path.endsWith("profiles") ? path : `${path}/profiles`
            });
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

    const loadSaves = async () => {
        if (!activeProfile) return;
        try {
            const result = await invoke<GameSave[]>("get_game_saves", { profilePath: activeProfile.path });
            setSaves(result);
            if (result.length > 0) {
                if (!result.find(s => s.id === activeSaveId)) {
                    const quick = result.find(s => s.id === "quicksave");
                    setActiveSaveId(quick ? quick.id : result[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to load saves:", err);
        }
    };

    const loadProfileData = async () => {
        if (!activeSave) return;
        setIsModifying(true);
        try {
            const gameSiiPath = `${activeSave.path}/game.sii`;
            const content = await invoke<string>("decode_sii_path", { path: gameSiiPath });
            
            const moneyMatch = content.match(/money_account:\s*(-?\d+)/);
            if (moneyMatch) {
                setMoney(moneyMatch[1]);
            }

            const expMatch = content.match(/experience_points:\s*(\d+)/);
            if (expMatch) {
                setExp(expMatch[1]);
            }

            const parsedSkills = { ...skills };
            Object.keys(parsedSkills).forEach(skill => {
                const match = content.match(new RegExp(`${skill}:\\s*(\\d+)`));
                if (match) {
                    parsedSkills[skill as keyof typeof skills] = match[1];
                }
            });
            setSkills(parsedSkills);
        } catch (err) {
            console.error("Failed to load profile data:", err);
        } finally {
            setTimeout(() => setIsModifying(false), 300);
        }
    };

    const saveProfileData = async () => {
        if (!activeSave) return;
        setIsModifying(true);
        try {
            const gameSiiPath = `${activeSave.path}/game.sii`;
            let content = await invoke<string>("decode_sii_path", { path: gameSiiPath });
            
            content = content.replace(/money_account:\s*-?\d+/, `money_account: ${money}`);
            content = content.replace(/experience_points:\s*\d+/, `experience_points: ${exp}`);
            
            Object.entries(skills).forEach(([skill, value]) => {
                content = content.replace(new RegExp(`${skill}:\\s*\\d+`), `${skill}: ${value}`);
            });
            
            await invoke("write_file", { path: gameSiiPath, contents: content });
            setLastSaved(Date.now());
        } catch (err) {
            console.error("Failed to save profile data:", err);
        } finally {
            setTimeout(() => setIsModifying(false), 300);
        }
    };

    // Auto-load profile data when a save is selected or tab changes
    useEffect(() => {
        if (activeSaveId && activeSubTab === "profile") {
            loadProfileData();
        }
    }, [activeSaveId, activeSubTab]);

    const handleBrowse = async () => {
        try {
            const selected = await invoke<string | null>("pick_folder");
            if (selected) {
                localStorage.setItem("game_profiles_path", selected);
                refreshProfiles();
            }
        } catch (err) {
            console.error("Dialog error:", err);
        }
    };

    const switchProfile = (id: string) => {
        setActiveId(id);
        localStorage.setItem("active_save_profile", id);
        window.dispatchEvent(new Event("profile-changed"));
        setIsDropdownOpen(false);
    };

    // Close dropdowns on outside click
    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
                setIsSavesDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    return (
        <div className="flex w-full h-full overflow-hidden">
            {/* ── Inner Sidebar ── */}
            <div
                className="w-56 flex flex-col p-3 shrink-0 gap-1"
                style={{
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border-subtle)'
                }}
            >
                <h2 className="px-3 mb-2 text-[14px] font-semibold select-none" style={{ color: 'var(--text-sidebar-secondary)' }}>
                    Editor
                </h2>

                {SAVE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                        <div key={tab.id}>
                            <button
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-1.5 text-[14px] font-medium rounded-md transition-all duration-300 whitespace-nowrap ${isActive
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
                            {isActive && tab.subItems && (
                                <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-zinc-700/40 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {tab.subItems.map((sub) => (
                                        <button
                                            key={sub}
                                            onClick={() => {
                                                const el = document.getElementById(`section-${sub.toLowerCase()}`);
                                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }}
                                            className="text-[13px] py-1 text-left transition-colors hover:text-white/90"
                                            style={{ color: 'var(--text-sidebar-secondary)' }}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Content Area ── */}
            <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--bg-main)' }}>
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
                                color: 'var(--text-primary)',
                                borderColor: 'var(--border-subtle)',
                                backgroundColor: 'transparent',
                            }}
                        >
                            <HardDrive size={14} className="text-[#24c8db] shrink-0" />
                            <span className="truncate">{activeProfile?.name || "No Profiles Found"}</span>
                            <ChevronDown
                                size={14}
                                className="shrink-0 transition-transform duration-200 opacity-50"
                                style={{ color: 'var(--text-primary)' }}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div
                                className="absolute right-0 top-full mt-1 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[280px] animate-in fade-in slide-in-from-top-1 duration-150"
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
                                    <div className="max-h-[320px] overflow-auto custom-scrollbar">
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
                                                    <Check size={14} className="text-[#24c8db]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Slot Selector */}
                    <div ref={saveDropdownRef} className="relative">
                        <button
                            onClick={() => setIsSavesDropdownOpen(!isSavesDropdownOpen)}
                            disabled={saves.length === 0}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border transition-all duration-200 hover:bg-zinc-500/10 max-w-[200px] disabled:opacity-40"
                            style={{
                                color: 'var(--text-primary)',
                                borderColor: 'var(--border-subtle)',
                                backgroundColor: 'transparent',
                            }}
                        >
                            <SaveIcon size={14} className="opacity-50 shrink-0" />
                            <span className="truncate">{activeSave?.name || "No Saves"}</span>
                            <ChevronDown size={14} className="shrink-0 opacity-30" />
                        </button>

                        {isSavesDropdownOpen && (
                            <div
                                className="absolute right-0 top-full mt-1 w-[200px] z-[100] rounded-xl border p-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-subtle)' }}
                            >
                                <div className="max-h-[300px] overflow-auto custom-scrollbar p-0.5">
                                    {saves.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setActiveSaveId(s.id);
                                                setIsSavesDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-zinc-500/10 transition-colors"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            <span className="truncate font-medium">{s.name}</span>
                                            {activeSaveId === s.id && <Check size={14} className="text-[#24c8db]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reload Button */}
                    <button
                        onClick={refreshProfiles}
                        disabled={isReloading}
                        className="p-2 rounded-lg border transition-all duration-200 hover:bg-zinc-500/10 disabled:opacity-40"
                        style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                        }}
                        title="Reload profiles and saves"
                    >
                        <RotateCw
                            size={14}
                            className={`transition-transform ${isReloading ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>

                {/* ── Main View Area ── */}
                <div className="flex-1 flex flex-col p-8 overflow-auto custom-scrollbar">
                    {activeSubTab === "overview" && (
                        <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {error ? (
                                <>
                                    <AlertCircle size={48} className="text-red-500/50 mb-4" />
                                    <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Profile Path Error</p>
                                    <p className="text-xs max-w-xs opacity-60 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        Could not find profiles at the selected path.
                                    </p>
                                    <div className="flex gap-2 mt-6">
                                        <button
                                            onClick={handleBrowse}
                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#24c8db] text-black hover:bg-[#20b5c7] transition-colors shadow-lg shadow-[#24c8db]/20"
                                        >
                                            Fix Path
                                        </button>
                                    </div>
                                </>
                            ) : profiles.length === 0 ? (
                                <>
                                    <HardDrive size={48} className="text-amber-500/30 mb-4" />
                                    <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No Profiles Found</p>
                                    <p className="text-xs max-w-[280px] mb-6 opacity-60 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        We couldn't find any profiles in the selected directory. Make sure it contains a <span className="text-amber-500/80 font-mono">/profiles</span> folder.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleBrowse}
                                            className="px-5 py-2 rounded-lg text-xs font-bold bg-[#24c8db] text-black hover:bg-[#20b5c7] transition-all shadow-lg shadow-[#24c8db]/20"
                                        >
                                            Pick Folder
                                        </button>
                                        <button
                                            onClick={onNavigate}
                                            className="px-5 py-2 rounded-lg text-xs font-bold transition-all border bg-black/5 hover:bg-black/10"
                                            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                                        >
                                            Open Settings
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-full bg-[#24c8db]/10 border border-[#24c8db]/20 rounded-2xl p-6 mb-8 flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center border-4 border-[#24c8db]/30 overflow-hidden">
                                            <span className="text-3xl font-black text-[#24c8db]">{activeProfile?.name?.[0]}</span>
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{activeProfile?.name}</h3>
                                            <p className="text-xs opacity-60 flex items-center gap-2 mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                <Folder size={12} />
                                                {activeId}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full grid grid-cols-2 gap-4 text-left">
                                        <div className="p-4 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-subtle)' }}>
                                            <p className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-1" style={{ color: 'var(--text-primary)' }}>Level</p>
                                            <p className="text-xl font-black text-[#24c8db]">--</p>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-subtle)' }}>
                                            <p className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-1" style={{ color: 'var(--text-primary)' }}>Money</p>
                                            <p className="text-xl font-black text-[#24c8db]">--</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeSubTab === "profile" && (
                        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h1 className="text-xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Profile Management</h1>

                            {!activeSaveId ? (
                                <div className="text-center p-12 border border-dashed rounded-3xl" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <SaveIcon size={40} className="mx-auto mb-4 opacity-10" style={{ color: 'var(--text-primary)' }} />
                                    <p className="text-sm font-bold opacity-30" style={{ color: 'var(--text-primary)' }}>Please select a save slot in the top bar to continue</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* ── Money Section ── */}
                                    <div id="section-money">
                                        <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Account Balance</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Total liquid money in your bank account.</p>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={money}
                                                    onChange={(e) => setMoney(e.target.value)}
                                                    className="w-[180px] bg-black/20 border rounded-lg px-3 py-2 text-xs text-right focus:outline-none focus:border-[#24c8db] transition-all font-bold text-[#24c8db]"
                                                    style={{ borderColor: 'var(--border-subtle)' }}
                                                    placeholder="0"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30 pointer-events-none" style={{ color: 'var(--text-primary)' }}>EUR</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── EXP Section ── */}
                                    <div id="section-exp">
                                        <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Experience Points</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Your total accumulated experience.</p>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={exp}
                                                    onChange={(e) => setExp(e.target.value)}
                                                    className="w-[180px] bg-black/20 border rounded-lg px-3 py-2 text-xs text-right focus:outline-none focus:border-[#24c8db] transition-all font-bold text-[#24c8db]"
                                                    style={{ borderColor: 'var(--border-subtle)' }}
                                                    placeholder="0"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30 pointer-events-none" style={{ color: 'var(--text-primary)' }}>EXP</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Skill Section ── */}
                                    <div id="section-skill">
                                        <div className="flex flex-col py-4 gap-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Skill Points</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your driver skill allocations (Max 6 per skill).</p>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {Object.entries(skills).map(([key, value]) => (
                                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-black/10 border transition-colors hover:bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                                            {key.replace('_', ' ')}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="6"
                                                            value={value}
                                                            onChange={(e) => {
                                                                let val = parseInt(e.target.value);
                                                                if (isNaN(val)) val = 0;
                                                                if (val > 6) val = 6;
                                                                if (val < 0) val = 0;
                                                                setSkills(prev => ({ ...prev, [key]: String(val) }));
                                                            }}
                                                            className="w-12 bg-black/20 border rounded-md px-2 py-1 text-xs text-center focus:outline-none focus:border-[#24c8db] transition-all font-bold text-[#24c8db] hide-spin"
                                                            style={{ borderColor: 'var(--border-subtle)' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Company Section ── */}
                                    <div id="section-company">
                                        <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Company Name</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Your trucking company name.</p>
                                            </div>
                                            <p className="text-xs opacity-40 font-medium" style={{ color: 'var(--text-secondary)' }}>Coming soon</p>
                                        </div>
                                        <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>HQ City</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Your company headquarters location.</p>
                                            </div>
                                            <p className="text-xs opacity-40 font-medium" style={{ color: 'var(--text-secondary)' }}>Coming soon</p>
                                        </div>
                                    </div>

                                    {/* ── Warning Footer ── */}
                                    <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <div className="p-2 rounded-lg bg-amber-500/10">
                                            <AlertCircle size={14} className="text-amber-500" />
                                        </div>
                                        <p className="text-[10px] leading-tight opacity-50 max-w-[340px]" style={{ color: 'var(--text-secondary)' }}>
                                            Ensure the game is at the main menu or closed. Reload the save in-game to apply changes.
                                        </p>
                                        <div className="flex items-center gap-2 ml-auto">
                                            <button
                                                onClick={loadProfileData}
                                                disabled={isModifying}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-bold transition-all hover:bg-zinc-500/10 disabled:opacity-50"
                                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                                            >
                                                <RotateCw size={14} className={isModifying ? "animate-spin" : ""} />
                                                Read
                                            </button>
                                            <button
                                                onClick={saveProfileData}
                                                disabled={isModifying}
                                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#24c8db] text-black text-[11px] font-bold hover:bg-[#20b5c7] transition-all disabled:opacity-50 shadow-lg shadow-[#24c8db]/20"
                                            >
                                                {isModifying ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSubTab === "truck" && (
                        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Truck size={48} className="opacity-20 mb-4" style={{ color: 'var(--text-primary)' }} />
                            <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Truck Management</p>
                            <p className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>Coming soon: Edit truck parts, engines, and paint.</p>
                        </div>
                    )}

                    {activeSubTab === "trailer" && (
                        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Briefcase size={48} className="opacity-20 mb-4" style={{ color: 'var(--text-primary)' }} />
                            <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Trailer Management</p>
                            <p className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>Coming soon: Manage trailer configurations and loads.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
