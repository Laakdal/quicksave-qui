import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import {
    RefreshCw,
    Save as SaveIcon,
    HardDrive,
    ChevronDown,
    User,
    Check,
    Pencil
} from "lucide-react";
import { SaveEditAction } from "./SaveEditAction";
import { SegmentedControl } from "../../components/ui/SegmentedControl";

/* ── Action Button ─────────────────────────────────────────────── */
function ActionBtn({
    icon: Icon,
    label,
    primary = false,
    disabled = false,
    tooltip,
    onClick,
}: {
    icon: React.ElementType;
    label?: string;
    primary?: boolean;
    disabled?: boolean;
    tooltip?: string;
    onClick?: () => void;
}) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            title={tooltip}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 select-none
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5 active:translate-y-0"}
        ${primary ? "bg-accent text-black hover:bg-accent-hover" : ""}`}
            style={
                primary
                    ? {}
                    : {
                        backgroundColor: "rgba(var(--zinc-700), 0.5)",
                        color: "var(--text-primary)",
                    }
            }
        >
            <Icon size={14} strokeWidth={2} />
            {label}
        </button>
    );
}

function VSep() {
    return (
        <div
            className="w-px h-7 mx-1 shrink-0"
            style={{ backgroundColor: "var(--border-subtle)" }}
        />
    );
}

type TruckAccessory = {
    id: string;
    block_type: string;
    data_path: string;
    lines: string[];
    wheel_offset: number | null;
    paint_colors: Record<string, string>;
};

type TruckDetail = {
    id: string;
    brand_id: string;
    display_name: string;
    license_plate: string;
    accessories: TruckAccessory[];
    accessories_count: number;
    garage: string;
};

type PlayerVehicles = {
    trucks: TruckDetail[];
    my_truck: string | null;
    assigned_truck: string | null;
    trailers: string[];
    assigned_trailer: string | null;
};

type SaveTruckAccessoryChange = {
    id: string | null;
    block_type: string;
    lines: string[];
    status: "added" | "edited" | "deleted" | "unchanged";
};

type TruckRow = {
    id: string;
    active: boolean;
    name: string;
    brand: string;
    licensePlate: string;
    accessories: TruckAccessory[];
    accessoriesCount: number;
    garage: string;
};

export function SaveManagerView() {
    const [activeSubTab, setActiveSubTab] = useState("profile");
    const [editingTruck, setEditingTruck] = useState<TruckRow | null>(null);

    const [profiles, setProfiles] = useState<{ id: string, name: string, path: string }[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string>("");

    const [saves, setSaves] = useState<{ id: string, name: string, path: string }[]>([]);
    const [activeSaveId, setActiveSaveId] = useState<string>("");
    const [trucks, setTrucks] = useState<TruckRow[]>([]);

    const [isReloading, setIsReloading] = useState(false);

    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSavesDropdownOpen, setIsSavesDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const saveDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
            if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
                setIsSavesDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        refreshProfiles();
    }, []);

    useEffect(() => {
        if (activeProfileId) {
            loadSaves();
        }
    }, [activeProfileId]);

    useEffect(() => {
        if (activeSaveId) {
            loadVehicles();
        } else {
            setTrucks([]);
        }
    }, [activeSaveId, saves]);

    const refreshProfiles = async () => {
        setIsReloading(true);
        try {
            let path = localStorage.getItem("game_profiles_path");
            if (!path) {
                const detected = await invoke<string | null>("auto_detect_profiles");
                if (detected) {
                    path = detected;
                    localStorage.setItem("game_profiles_path", detected);
                } else {
                    path = "C:\\Users\\%USERNAME%\\Documents\\Euro Truck Simulator 2\\profiles";
                }
            }

            const gameProfiles = await invoke<{ id: string, name: string, path: string }[]>("get_game_profiles", {
                path: path.endsWith("profiles") ? path : `${path}/profiles`
            });
            setProfiles(gameProfiles);

            if (gameProfiles.length > 0) {
                const savedProfileId = localStorage.getItem("active_save_profile");
                if (savedProfileId && gameProfiles.find(p => p.id === savedProfileId)) {
                    setActiveProfileId(savedProfileId);
                } else {
                    setActiveProfileId(gameProfiles[0].id);
                    localStorage.setItem("active_save_profile", gameProfiles[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to load profiles:", err);
        } finally {
            setTimeout(() => setIsReloading(false), 500);
        }
    };

    const loadSaves = async () => {
        const profile = profiles.find(p => p.id === activeProfileId);
        if (!profile) return;

        try {
            const result = await invoke<{ id: string, name: string, path: string }[]>("get_game_saves", { profilePath: profile.path });
            setSaves(result);
            if (result.length > 0) {
                const quick = result.find(s => s.id === "quicksave");
                setActiveSaveId(quick ? quick.id : result[0].id);
            } else {
                setActiveSaveId("");
                setTrucks([]);
            }
        } catch (err) {
            console.error("Failed to load saves:", err);
        }
    };

    const loadVehicles = async (): Promise<TruckRow[]> => {
        const save = saves.find(s => s.id === activeSaveId);
        if (!save) return [];

        try {
            const vehicles = await invoke<PlayerVehicles>("get_player_vehicles", { path: `${save.path}/game.sii` });
            const loadedTrucks = vehicles.trucks.map((truck) => ({
                id: truck.id,
                active: truck.id === (vehicles.assigned_truck || vehicles.my_truck),
                name: truck.display_name,
                brand: truck.brand_id,
                licensePlate: truck.license_plate || "-",
                accessories: truck.accessories,
                accessoriesCount: truck.accessories_count,
                garage: truck.garage
            }));

            setTrucks(loadedTrucks);
            return loadedTrucks;
        } catch (err) {
            console.error("Failed to load vehicles:", err);
            setTrucks([]);
            return [];
        }
    };

    const handleActivateTruck = async (truckId: string) => {
        if (!activeSaveGamePath) return;

        try {
            await invoke("save_active_truck", { path: activeSaveGamePath, truckId });
            setTrucks((currentTrucks) => currentTrucks.map((truck) => ({
                ...truck,
                active: truck.id === truckId,
            })));
        } catch (err) {
            console.error("Failed to save active truck:", err);
        }
    };

    const tabs = [
        { id: "profile", label: "Profile" },
        { id: "truck", label: "Truck" },
        { id: "trailer", label: "Trailer" },
    ];

    const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
    const activeSave = saves.find((save) => save.id === activeSaveId);
    const activeSaveGamePath = activeSave ? `${activeSave.path}/game.sii` : "";

    if (editingTruck) {
        return (
            <SaveEditAction
                truck={editingTruck}
                activeProfileName={activeProfile?.name || "Active Profile..."}
                activeSaveName={activeSave?.name || "Select Save..."}
                isReloading={isReloading}
                canSave={Boolean(activeSaveGamePath)}
                onSave={async (changes: SaveTruckAccessoryChange[]) => {
                    await handleActivateTruck(editingTruck.id);
                    if (changes.length > 0 && activeSaveGamePath) {
                        await invoke("save_truck_accessories", {
                            request: {
                                path: activeSaveGamePath,
                                truckId: editingTruck.id,
                                changes: changes.map((change) => ({
                                    id: change.id,
                                    blockType: change.block_type,
                                    lines: change.lines,
                                    status: change.status,
                                })),
                            },
                        });
                        const loadedTrucks = await loadVehicles();
                        const updatedTruck = loadedTrucks.find((truck) => truck.id === editingTruck.id);
                        if (updatedTruck) {
                            setEditingTruck(updatedTruck);
                        }
                    }
                }}
                onRefresh={refreshProfiles}
                onBack={() => setEditingTruck(null)}
            />
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto p-9">
            <div className="max-w-[1070px] mx-auto">

                {/* ── Toolbar ────────────────────────────────────────── */}
                <div
                    className="flex flex-wrap items-center rounded-xl p-3 mb-6"
                    style={{
                        backgroundColor: "rgb(var(--panel-dark))",
                        border: "1px solid var(--border-subtle)",
                    }}
                >
                    {/* Left side: Profile */}
                    <div className="flex items-center gap-2">
                        <div ref={profileDropdownRef} className="relative">
                            <button
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-sm bg-black/20 border outline-none focus:border-accent transition-all cursor-pointer hover:bg-black/30 max-w-[320px]"
                                style={{
                                    color: 'var(--text-primary)',
                                    borderColor: 'var(--border-subtle)',
                                }}
                            >
                                <HardDrive size={14} className="text-accent shrink-0" />
                                <span className="truncate">
                                    {profiles.find(p => p.id === activeProfileId)?.name || "Active Profile..."}
                                </span>
                                <ChevronDown size={14} className="shrink-0 opacity-30" />
                            </button>

                            <AnimatePresence>
                                {isProfileDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 top-full mt-2 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[280px]"
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
                                                        onClick={() => {
                                                            setActiveProfileId(p.id);
                                                            localStorage.setItem("active_save_profile", p.id);
                                                            setIsProfileDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${p.id === activeProfileId
                                                            ? 'bg-accent/10'
                                                            : 'hover:bg-zinc-500/10'
                                                            }`}
                                                    >
                                                        <User
                                                            size={15}
                                                            className="shrink-0"
                                                            style={{ color: p.id === activeProfileId ? 'var(--accent)' : 'var(--text-secondary)' }}
                                                        />
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span
                                                                className="text-sm font-medium truncate"
                                                                style={{ color: p.id === activeProfileId ? 'var(--accent)' : 'var(--text-primary)' }}
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
                                                        {p.id === activeProfileId && (
                                                            <Check size={14} className="text-accent" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <VSep />

                    {/* Middle: Mode Switcher */}
                    <div className="flex-1 flex justify-center">
                        <SegmentedControl
                            items={tabs}
                            value={activeSubTab}
                            onChange={setActiveSubTab}
                            size="sm"
                        />
                    </div>

                    <VSep />

                    {/* Right side: Save Slot & Refresh */}
                    <div className="flex items-center gap-2">

                        {/* Save Slot Selector */}
                        <div ref={saveDropdownRef} className="relative">
                            <button
                                onClick={() => setIsSavesDropdownOpen(!isSavesDropdownOpen)}
                                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-sm bg-black/20 border outline-none focus:border-accent transition-all cursor-pointer hover:bg-black/30 max-w-[200px]"
                                style={{
                                    color: 'var(--text-primary)',
                                    borderColor: 'var(--border-subtle)',
                                }}
                            >
                                <SaveIcon size={14} className="opacity-50 shrink-0" />
                                <span className="truncate">
                                    {saves.find(s => s.id === activeSaveId)?.name || "Select Save..."}
                                </span>
                                <ChevronDown size={14} className="shrink-0 opacity-30" />
                            </button>

                            <AnimatePresence>
                                {isSavesDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-2 w-[200px] z-[100] rounded-xl border p-1 shadow-2xl"
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
                                                    {activeSaveId === s.id && <Check size={14} className="text-accent" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-6 mx-1" style={{ backgroundColor: "var(--border-subtle)" }} />
                        <ActionBtn
                            icon={RefreshCw}
                            tooltip="Reload profiles and saves"
                            onClick={refreshProfiles}
                            disabled={isReloading}
                        />
                    </div>
                </div>

                {activeSubTab === "truck" && (
                    <div
                        className="overflow-hidden rounded-xl"
                        style={{
                            backgroundColor: "rgb(var(--panel-dark))",
                            border: "1px solid var(--border-subtle)",
                        }}
                    >
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <th className="w-16 px-6 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>
                                        Active
                                    </th>
                                    <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                                        Truck
                                    </th>
                                    <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                                        License Plate
                                    </th>
                                    <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                                        Garage
                                    </th>
                                    <th className="w-24 px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {trucks.length > 0 ? trucks.map((truck) => (
                                    <tr
                                        key={truck.id}
                                        className="transition-colors hover:bg-zinc-500/5"
                                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                    >
                                        <td className="px-6 py-4">
                                            <span
                                                className={`block h-3 w-3 rounded-full ${truck.active ? "bg-emerald-400" : "bg-zinc-600"}`}
                                            />
                                        </td>
                                        <td className="px-4 py-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                                            {truck.name}
                                        </td>
                                        <td className="px-4 py-4 font-medium" style={{ color: "var(--text-primary)" }}>
                                            {truck.licensePlate}
                                        </td>
                                        <td className="px-4 py-4 font-medium" style={{ color: "var(--text-primary)" }}>
                                            {truck.garage}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    disabled={truck.active || !activeSaveGamePath}
                                                    onClick={() => handleActivateTruck(truck.id)}
                                                    className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-all ${truck.active ? "cursor-not-allowed opacity-45" : "hover:-translate-y-0.5 hover:bg-zinc-500/10"}`}
                                                    style={{
                                                        color: truck.active ? "var(--text-secondary)" : "var(--accent)",
                                                        borderColor: "var(--border-subtle)",
                                                    }}
                                                    title={truck.active ? "Current active truck" : "Activate truck"}
                                                >
                                                    {truck.active ? "Active" : "Activate"}
                                                </button>
                                                <button
                                                    onClick={() => setEditingTruck(truck)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5 hover:bg-zinc-500/10"
                                                    style={{
                                                        color: "var(--accent)",
                                                        borderColor: "var(--border-subtle)",
                                                    }}
                                                    title="Edit truck"
                                                >
                                                    <Pencil size={15} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center" style={{ color: "var(--text-secondary)" }}>
                                            No trucks found for the selected save.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    );
}
