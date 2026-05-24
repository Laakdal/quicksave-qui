import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pencil, Play, Truck } from "lucide-react";
import { SaveEditAction } from "./SaveEditAction";
import { SaveManagerToolbar } from "../../components/ui/Toolbar";
import { ToolbarButton } from "../../components/ui/ButtonBase";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";

type TruckAccessory = {
    id: string;
    block_type: string;
    data_path: string;
    lines: string[];
    wheel_offset: number | null;
    wheel_position: string | null;
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
    const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem("save_manager_active_tab") || "profile");
    const [editingTruck, setEditingTruck] = useState<TruckRow | null>(null);

    useEffect(() => {
        localStorage.setItem("save_manager_active_tab", activeSubTab);
    }, [activeSubTab]);

    const [profiles, setProfiles] = useState<{ id: string, name: string, path: string }[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string>("");

    const [saves, setSaves] = useState<{ id: string, name: string, path: string }[]>([]);
    const [activeSaveId, setActiveSaveId] = useState<string>("");
    const [trucks, setTrucks] = useState<TruckRow[]>([]);

    const [isReloading, setIsReloading] = useState(false);

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

                <SaveManagerToolbar
                    profiles={profiles}
                    activeProfileId={activeProfileId}
                    onProfileChange={(profileId) => {
                        setActiveProfileId(profileId);
                        localStorage.setItem("active_save_profile", profileId);
                    }}
                    saves={saves}
                    activeSaveId={activeSaveId}
                    onSaveChange={setActiveSaveId}
                    tabs={tabs}
                    activeSubTab={activeSubTab}
                    onSubTabChange={setActiveSubTab}
                    isReloading={isReloading}
                    onRefresh={refreshProfiles}
                />

                {activeSubTab === "truck" && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 px-6 text-center" style={{ color: "var(--text-secondary)" }}>
                                    Active
                                </TableHead>
                                <TableHead>Truck</TableHead>
                                <TableHead>License Plate</TableHead>
                                <TableHead>Garage</TableHead>
                                <TableHead className="w-24 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trucks.length > 0 ? trucks.map((truck) => (
                                <TableRow key={truck.id}>
                                    <TableCell className="px-6">
                                        <div className="flex justify-center">
                                            <span
                                                className={`block h-3 w-3 rounded-full ${truck.active ? "bg-emerald-400" : "bg-zinc-600"}`}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-semibold" style={{ color: "var(--text-primary)" }}>
                                        {truck.name}
                                    </TableCell>
                                    <TableCell className="font-medium" style={{ color: "var(--text-primary)" }}>
                                        {truck.licensePlate}
                                    </TableCell>
                                    <TableCell className="font-medium" style={{ color: "var(--text-primary)" }}>
                                        {truck.garage.replace("garage.", "").replace(/^\w/, (c) => c.toUpperCase())}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            <ToolbarButton
                                                icon={truck.active ? Truck : Play}
                                                size="table"
                                                tone={truck.active ? "success" : "accent"}
                                                disabled={truck.active || !activeSaveGamePath}
                                                onClick={() => handleActivateTruck(truck.id)}
                                                tooltip={truck.active ? "Current active truck" : "Activate truck"}
                                            />
                                            <ToolbarButton
                                                icon={Pencil}
                                                size="table"
                                                tone="accent"
                                                onClick={() => setEditingTruck(truck)}
                                                tooltip="Edit truck"
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-6 py-10 text-center" style={{ color: "var(--text-secondary)" }}>
                                        No trucks found for the selected save.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}

                {activeSubTab === "trailer" && (
                    <div className="py-10 text-center" style={{ color: "var(--text-secondary)" }}>
                        Trailer management is not implemented yet.
                    </div>
                )}

            </div>
        </div>
    );
}
