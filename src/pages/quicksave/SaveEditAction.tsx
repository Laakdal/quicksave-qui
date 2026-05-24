import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, ChevronDown, Clipboard, Code2, Fuel, Lock, MoreVertical, Pencil, RotateCcw, Search, Trash2, Unlock, Wrench, X } from "lucide-react";
import { PopupCodeSEAction } from "../../components/ui/PopupCodeSEAction";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ToolbarButton } from "../../components/ui/ButtonBase";
import { SaveEditToolbar } from "../../components/ui/Toolbar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import { ContextMenu } from "../../components/ui/ContextMenu";

type TruckAccessory = {
    id: string;
    block_type: string;
    data_path: string;
    lines: string[];
    wheel_offset: number | null;
    wheel_position: string | null;
    paint_colors: Record<string, string>;
};

type AccessoryStatus = "unchanged" | "added" | "edited" | "deleted";
type AccessorySegment = "all" | "base" | "wheels" | "paint" | "cargo" | "driver_plate" | "other";
type ParsedAccessoryBlock = {
    blockType: string;
    id: string | null;
    lines: string[];
};

const ACCESSORY_BLOCK_TYPES = [
    "vehicle_accessory",
    "vehicle_addon_accessory",
    "vehicle_wheel_accessory",
    "vehicle_cargo_accessory",
    "vehicle_driver_plate_accessory",
    "vehicle_paint_job_accessory",
];

export type EditableTruckAccessory = TruckAccessory & {
    localId: string;
    status: AccessoryStatus;
};

type TruckRow = {
    id: string;
    active: boolean;
    name: string;
    brand: string;
    licensePlate: string;
    licensePlateLine: string;
    fuelPercent: number | null;
    damagePercent: number | null;
    accessories: TruckAccessory[];
    accessoriesCount: number;
    garage: string;
};

interface SaveEditActionProps {
    truck: TruckRow;
    activeProfileName: string;
    activeSaveName: string;
    isReloading: boolean;
    canSave: boolean;
    onSave: (changes: { id: string | null; block_type: string; lines: string[]; status: AccessoryStatus }[]) => Promise<void>;
    onSaveLicensePlate: (licensePlateLine: string) => Promise<void>;
    onRefuel?: () => Promise<void>;
    onRepair?: () => Promise<void>;
    onRefresh: () => void;
    onBack: () => void;
}

type AccessoryDisplayGroups = Record<string, Record<string, Record<string, EditableTruckAccessory[]>>>;

type CopiedAccessoryBlock = {
    block_type: string;
    originalId: string;
    lines: string[];
};

type LockedBlock = {
    truckId: string;
    blockType: string;
    originalBlockId: string;
    bodyLines: string[];
    fingerprint: string;
};

function normalizeNamelessIds(value: string) {
    return value.replace(/_nameless[\w.]*/gi, "_nameless");
}

function normalizePath(value: string) {
    return value.trim().replace(/^"|"$/g, "").replace(/\\/g, "/").replace(/^\//, "").toLowerCase();
}

function accessoryFingerprint(blockType: string, lines: string[]) {
    const normalized = [blockType.trim().toLowerCase()];
    const dataPath = lines.find((line) => line.trim().startsWith("data_path:"));
    if (dataPath) {
        normalized.push(normalizePath(dataPath.slice(dataPath.indexOf(":") + 1)));
    }
    normalized.push(...lines.map((line) => {
        const withoutIds = normalizeNamelessIds(line).trim().toLowerCase();
        if (!withoutIds.startsWith("data_path:")) return withoutIds;
        return `data_path:${normalizePath(withoutIds.slice(withoutIds.indexOf(":") + 1))}`;
    }));
    return normalized.join("\n");
}

function parseDataPath(lines: string[]) {
    const line = lines.find((item) => item.trim().startsWith("data_path:"));
    if (!line) return "";
    return line.slice(line.indexOf(":") + 1).trim().replace(/^"|"$/g, "");
}

function parseWheelOffset(blockType: string, lines: string[]) {
    if (blockType !== "vehicle_wheel_accessory") return null;
    const line = lines.find((item) => item.trim().startsWith("offset:"));
    if (!line) return null;
    const value = Number(line.slice(line.indexOf(":") + 1).trim());
    return Number.isFinite(value) ? value : null;
}

function parseWheelPosition(blockType: string, dataPath: string) {
    if (blockType !== "vehicle_wheel_accessory") return null;
    const segments = dataPath.split("/").filter(Boolean);
    if (segments.some((segment) => segment.startsWith("f_"))) return "Front";
    if (segments.some((segment) => segment.startsWith("r_"))) return "Rear";
    return "Unknown";
}

function parsePaintColors(blockType: string, lines: string[]) {
    if (blockType !== "vehicle_paint_job_accessory") return {};
    return lines.reduce<Record<string, string>>((colors, line) => {
        const index = line.indexOf(":");
        if (index === -1) return colors;
        const key = line.slice(0, index).trim();
        if (key === "base_color" || key.endsWith("_color")) {
            colors[key] = line.slice(index + 1).trim();
        }
        return colors;
    }, {});
}

function makeAddedAccessory(blockType: string, lines: string[], id?: string | null): EditableTruckAccessory {
    const dataPath = parseDataPath(lines);
    const localId = id ?? `temp-${crypto.randomUUID()}`;
    return {
        id: localId,
        localId,
        block_type: blockType,
        data_path: dataPath,
        lines: [...lines],
        wheel_offset: parseWheelOffset(blockType, lines),
        wheel_position: parseWheelPosition(blockType, dataPath),
        paint_colors: parsePaintColors(blockType, lines),
        status: "added",
    };
}

function makeAccessoryFromCopiedBlock(block: CopiedAccessoryBlock): EditableTruckAccessory {
    return makeAddedAccessory(block.block_type, block.lines);
}

function renderAccessoryBlockText(accessory: { block_type: string; id: string; lines: string[] }) {
    return `${accessory.block_type} : ${accessory.id} {\n${accessory.lines.map((line) => ` ${line}`).join("\n")}\n}`;
}

function parseAccessoryBlockDraft(value: string, fallbackBlockType: string, fallbackId: string | null): ParsedAccessoryBlock {
    const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
    const header = lines[0]?.match(/^(\w+)\s*:\s*([^\s{]+)\s*\{?$/);
    const hasClosingBrace = lines[lines.length - 1] === "}";

    if (!header) {
        return { blockType: fallbackBlockType, id: fallbackId, lines };
    }

    return {
        blockType: header[1],
        id: header[2],
        lines: lines.slice(1, hasClosingBrace ? -1 : undefined),
    };
}

function randomNamelessId() {
    const part = (length: number) => Array.from(crypto.getRandomValues(new Uint8Array(length)), (value) => (value % 16).toString(16)).join("");
    return `_nameless.${part(3)}.${part(4)}.${part(4)}`;
}

function renderNewAccessoryDraft(blockType: string, id = randomNamelessId()) {
    return `${blockType} : ${id} {\n data_path: ""\n}`;
}

export function filterAccessoriesBySegment(accessories: EditableTruckAccessory[], segment: AccessorySegment, query: string) {
    const q = query.trim().toLowerCase();

    if (q) {
        return accessories.filter((acc) =>
            acc.id.toLowerCase().includes(q) ||
            acc.data_path.toLowerCase().includes(q) ||
            acc.block_type.toLowerCase().includes(q)
        );
    }

    if (segment === "all") return accessories;

    if (segment === "base") {
        return accessories.filter((accessory) => accessory.block_type === "vehicle_accessory");
    } else if (segment === "wheels") {
        return accessories.filter((accessory) => accessory.block_type === "vehicle_wheel_accessory");
    } else if (segment === "paint") {
        return accessories.filter((accessory) => accessory.block_type === "vehicle_paint_job_accessory");
    } else if (segment === "cargo") {
        return accessories.filter((accessory) => accessory.block_type === "vehicle_cargo_accessory");
    } else if (segment === "driver_plate") {
        return accessories.filter((accessory) => accessory.block_type === "vehicle_driver_plate_accessory");
    } else if (segment === "other") {
        return accessories.filter((accessory) => !["vehicle_accessory", "vehicle_wheel_accessory", "vehicle_paint_job_accessory", "vehicle_cargo_accessory", "vehicle_driver_plate_accessory"].includes(accessory.block_type));
    }

    return accessories;
}

export function groupAccessoriesForDisplay(accessories: EditableTruckAccessory[]) {
    return accessories.reduce<AccessoryDisplayGroups>((groups, accessory) => {
        const blockGroup = accessory.block_type;
        const positionGroup = accessory.block_type === "vehicle_wheel_accessory"
            ? accessory.wheel_position ?? "Unknown"
            : "All";
        const offsetGroup = accessory.block_type === "vehicle_wheel_accessory"
            ? `Offset ${accessory.wheel_offset ?? "unknown"}`
            : "All";

        groups[blockGroup] ??= {};
        groups[blockGroup][positionGroup] ??= {};
        groups[blockGroup][positionGroup][offsetGroup] ??= [];
        groups[blockGroup][positionGroup][offsetGroup].push(accessory);
        return groups;
    }, {});
}


export function SaveEditAction({ truck, activeProfileName, activeSaveName, isReloading, canSave, onSave, onSaveLicensePlate, onRefuel, onRepair, onRefresh, onBack }: SaveEditActionProps) {
    const [accessories, setAccessories] = useState<EditableTruckAccessory[]>(() => truck.accessories.map((accessory) => ({
        ...accessory,
        localId: accessory.id,
        status: "unchanged",
    })));
    const [editingAccessoryId, setEditingAccessoryId] = useState<string | null>(null);
    const [draftBlock, setDraftBlock] = useState("");
    const [isEditingLicensePlate, setIsEditingLicensePlate] = useState(false);
    const [showBackWarning, setShowBackWarning] = useState(false);
    const [isTruckInfoOpen, setIsTruckInfoOpen] = useState(true);
    const [accessorySegment, setAccessorySegment] = useState<AccessorySegment>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedBlock, setCopiedBlock] = useState<CopiedAccessoryBlock | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [openMenuPosition, setOpenMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lockedBlocks, setLockedBlocks] = useState<LockedBlock[]>([]);
    const [isAddingAccessory, setIsAddingAccessory] = useState(false);
    const [newBlockType, setNewBlockType] = useState(ACCESSORY_BLOCK_TYPES[0]);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, isOpen: boolean } | null>(null);

    useEffect(() => {
        setAccessories(truck.accessories.map((accessory) => ({
            ...accessory,
            localId: accessory.id,
            status: "unchanged",
        })));
        setSelectedIds(new Set());
        setEditingAccessoryId(null);
        setDraftBlock("");
        setOpenMenuId(null);
        setOpenMenuPosition(null);
        setIsAddingAccessory(false);
        setNewBlockType(ACCESSORY_BLOCK_TYPES[0]);
        setContextMenu(null);
    }, [truck.id, truck.accessories]);

    useEffect(() => {
        invoke<LockedBlock[]>("list_locked_blocks", { truckId: truck.id })
            .then(setLockedBlocks)
            .catch((error) => console.error("Failed to load locked accessory blocks:", error));
    }, [truck.id]);

    const filteredAccessories = useMemo(() => filterAccessoriesBySegment(accessories, accessorySegment, searchQuery), [accessories, accessorySegment, searchQuery]);
    
    const toggleSelection = (localId: string) => {
        const next = new Set(selectedIds);
        if (next.has(localId)) next.delete(localId);
        else next.add(localId);
        setSelectedIds(next);
    };

    const toggleAllSelection = (items: EditableTruckAccessory[]) => {
        const allInItems = items.every(item => selectedIds.has(item.localId));
        const next = new Set(selectedIds);
        if (allInItems) {
            items.forEach(item => next.delete(item.localId));
        } else {
            items.forEach(item => next.add(item.localId));
        }
        setSelectedIds(next);
    };

    const handleContextMenu = (e: React.MouseEvent, _accessory: EditableTruckAccessory) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, isOpen: true });
    };

    const copySelectedAccessories = async () => {
        const selectedItems = accessories.filter(acc => selectedIds.has(acc.localId));
        if (selectedItems.length === 0) return;

        const text = selectedItems.map(renderAccessoryBlockText).join("\n\n");
        try {
            await navigator.clipboard?.writeText(text);
        } catch (error) {
            console.error("Failed to copy selected accessories:", error);
        }
    };

    const groupedAccessories = useMemo(() => groupAccessoriesForDisplay(filteredAccessories), [filteredAccessories]);
    const allAccessoryGroup = useMemo<AccessoryDisplayGroups>(() => ({ Accessories: { All: { All: filteredAccessories } } }), [filteredAccessories]);
    const displayGroups = accessorySegment === "all" || searchQuery.trim() ? allAccessoryGroup : groupedAccessories;
    const isTrailer = truck.brand === "Trailer";
    const accessorySegmentItems = [
        { id: "all", label: "All" },
        { id: "base", label: "Base" },
        { id: "other", label: "Accessory" },
        { id: "wheels", label: "Wheels" },
        { id: "paint", label: "Paint" },
        isTrailer ? { id: "cargo", label: "Cargo" } : { id: "driver_plate", label: "Driver Plate" },
    ];
    const editingAccessory = accessories.find((accessory) => accessory.localId === editingAccessoryId) || null;
    const hasUnsavedChanges = accessories.some((accessory) => accessory.status !== "unchanged");
    const lockedFingerprints = useMemo(() => new Set(lockedBlocks.map((block) => block.fingerprint)), [lockedBlocks]);

    const openBlockEditor = (accessory: EditableTruckAccessory) => {
        setEditingAccessoryId(accessory.localId);
        setDraftBlock(renderAccessoryBlockText(accessory));
    };

    const openLicensePlateEditor = () => {
        setDraftBlock(truck.licensePlateLine || "license_plate: \"\"");
        setIsEditingLicensePlate(true);
    };

    const parsedDraftBlock = (fallbackBlockType = newBlockType, fallbackId: string | null = null) => parseAccessoryBlockDraft(draftBlock, fallbackBlockType, fallbackId);

    const openAddAccessory = () => {
        setNewBlockType(ACCESSORY_BLOCK_TYPES[0]);
        setDraftBlock(renderNewAccessoryDraft(ACCESSORY_BLOCK_TYPES[0]));
        setIsAddingAccessory(true);
    };

    const changeNewBlockType = (blockType: string) => {
        setNewBlockType(blockType);
        setDraftBlock((current) => {
            const parsed = parseAccessoryBlockDraft(current, blockType, randomNamelessId());
            return renderAccessoryBlockText({ block_type: blockType, id: parsed.id ?? randomNamelessId(), lines: parsed.lines });
        });
    };

    const applyNewAccessory = () => {
        const parsed = parsedDraftBlock(newBlockType);
        setAccessories((current) => [...current, makeAddedAccessory(parsed.blockType, parsed.lines, parsed.id)]);
        setIsAddingAccessory(false);
        setDraftBlock("");
    };

    const applyLicensePlateEdit = async () => {
        await onSaveLicensePlate(draftBlock);
        setIsEditingLicensePlate(false);
        setDraftBlock("");
    };

    const applyBlockEdit = () => {
        if (!editingAccessory) return;

        const parsed = parsedDraftBlock(editingAccessory.block_type, editingAccessory.id);
        const dataPath = parseDataPath(parsed.lines);

        setAccessories((current) => current.map((accessory) => {
            if (accessory.localId !== editingAccessory.localId) return accessory;
            return {
                ...accessory,
                id: parsed.id ?? accessory.id,
                block_type: parsed.blockType,
                data_path: dataPath,
                lines: parsed.lines,
                wheel_offset: parseWheelOffset(parsed.blockType, parsed.lines),
                wheel_position: parseWheelPosition(parsed.blockType, dataPath),
                paint_colors: parsePaintColors(parsed.blockType, parsed.lines),
                status: accessory.status === "added" ? "added" : "edited",
            };
        }));
        setEditingAccessoryId(null);
    };

    const markDeleted = (localId: string) => {
        setAccessories((current) => current.map((accessory) => (
            accessory.localId === localId
                ? { ...accessory, status: accessory.status === "added" ? "deleted" : "deleted" }
                : accessory
        )));
    };

    const restoreAccessory = (localId: string) => {
        setAccessories((current) => current.map((accessory) => (
            accessory.localId === localId
                ? { ...accessory, status: accessory.id.startsWith("temp-") ? "added" : "unchanged" }
                : accessory
        )));
    };

    const copyAccessory = async (accessory: EditableTruckAccessory) => {
        setCopiedBlock({ block_type: accessory.block_type, originalId: accessory.id, lines: [...accessory.lines] });
        setOpenMenuId(null);
        try {
            await navigator.clipboard?.writeText(renderAccessoryBlockText(accessory));
        } catch (error) {
            console.error("Failed to copy accessory block to clipboard:", error);
        }
    };

    const pasteAccessory = () => {
        if (!copiedBlock) return;
        setAccessories((current) => [...current, makeAccessoryFromCopiedBlock(copiedBlock)]);
        setOpenMenuId(null);
    };

    const toggleLock = async (accessory: EditableTruckAccessory) => {
        const fingerprint = accessoryFingerprint(accessory.block_type, accessory.lines);
        if (lockedFingerprints.has(fingerprint)) {
            await invoke("unlock_block", { truckId: truck.id, fingerprint });
            setLockedBlocks((current) => current.filter((block) => block.fingerprint !== fingerprint));
        } else {
            const locked = await invoke<LockedBlock>("lock_block", {
                truckId: truck.id,
                blockType: accessory.block_type,
                originalBlockId: accessory.id,
                bodyLines: accessory.lines,
            });
            setLockedBlocks((current) => [...current.filter((block) => block.fingerprint !== locked.fingerprint), locked]);
        }
        setOpenMenuId(null);
    };

    const handleSave = async () => {
        const activeFingerprints = new Set(
            accessories
                .filter((accessory) => accessory.status !== "deleted")
                .map((accessory) => accessoryFingerprint(accessory.block_type, accessory.lines))
        );
        const restoredChanges = lockedBlocks
            .filter((block) => !activeFingerprints.has(block.fingerprint))
            .map((block) => ({
                id: null,
                block_type: block.blockType,
                lines: block.bodyLines,
                status: "added" as AccessoryStatus,
            }));
        const changes = accessories
            .filter((accessory) => accessory.status !== "unchanged")
            .map((accessory) => ({
                id: accessory.id.startsWith("temp-") ? null : accessory.id,
                block_type: accessory.block_type,
                lines: accessory.lines,
                status: accessory.status,
            }));

        await onSave([...changes, ...restoredChanges]);

        setAccessories((current) => current
            .filter((accessory) => accessory.status !== "deleted")
            .map((accessory) => ({ ...accessory, status: "unchanged" })));
    };

    const closeAccessoryMenu = () => {
        setOpenMenuId(null);
        setOpenMenuPosition(null);
    };

    const toggleAccessoryMenu = (localId: string, event: React.MouseEvent<HTMLButtonElement>) => {
        if (openMenuId === localId) {
            closeAccessoryMenu();
            return;
        }

        const buttonBounds = event.currentTarget.getBoundingClientRect();
        const menuHeight = 190;
        const gap = 8;
        setOpenMenuPosition({
            left: Math.max(8, buttonBounds.right - 176),
            top: window.innerHeight - buttonBounds.bottom < menuHeight + gap
                ? Math.max(8, buttonBounds.top - menuHeight - gap)
                : buttonBounds.bottom + gap,
        });
        setOpenMenuId(localId);
    };

    const handleBack = () => {
        if (hasUnsavedChanges) {
            setShowBackWarning(true);
            return;
        }
        onBack();
    };

    return (
        <div className="h-full w-full overflow-y-auto p-9">
            <div className="mx-auto max-w-[1070px]">
                <SaveEditToolbar
                    activeProfileName={activeProfileName}
                    activeSaveName={activeSaveName}
                    isReloading={isReloading}
                    canSave={canSave}
                    onAdd={openAddAccessory}
                    onSave={handleSave}
                    onRefresh={onRefresh}
                    onBack={handleBack}
                />

                <div
                    className="overflow-hidden rounded-xl"
                    style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
                >
                    <button
                        className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-zinc-500/5"
                        onClick={() => setIsTruckInfoOpen((open) => !open)}
                    >
                        <div className="min-w-0">
                            {/* <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                Truck Information
                            </p> */}
                            <h1 className="truncate text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{truck.name}</h1>
                        </div>
                        <ChevronDown
                            size={18}
                            className={`shrink-0 transition-transform ${isTruckInfoOpen ? "rotate-180" : ""}`}
                            style={{ color: "var(--text-secondary)" }}
                        />
                    </button>
                    {isTruckInfoOpen && (
                        <div className="grid gap-3 border-t p-6 pt-5 text-sm md:grid-cols-2" style={{ borderColor: "var(--border-subtle)" }}>
                            {/* <div style={{ color: "var(--text-secondary)" }}>Brand: <span style={{ color: "var(--text-primary)" }}>{truck.brand}</span></div> */}
                            <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                                License Plate: <span style={{ color: "var(--text-primary)" }}>{truck.licensePlate}</span>
                                <ToolbarButton
                                    icon={Pencil}
                                    variant="primary"
                                    size="table"
                                    disabled={!canSave}
                                    onClick={openLicensePlateEditor}
                                    tooltip="Edit license plate"
                                />
                            </div>
                            <div style={{ color: "var(--text-secondary)" }}>Garage: <span style={{ color: "var(--text-primary)" }}>{truck.garage.replace("garage.", "").replace(/^\w/, (c) => c.toUpperCase())}</span></div>
                            {!isTrailer && truck.fuelPercent !== null && (
                                <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                                    Fuel: <span style={{ color: "var(--text-primary)" }}>{truck.fuelPercent}%</span>
                                    <ToolbarButton
                                        icon={Fuel}
                                        variant="primary"
                                        size="table"
                                        disabled={!canSave || truck.fuelPercent >= 100 || !onRefuel}
                                        onClick={onRefuel}
                                        tooltip="Refuel to 100%"
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                                Damage: <span style={{ color: "var(--text-primary)" }}>{truck.damagePercent ?? 0}%</span>
                                <ToolbarButton
                                    icon={Wrench}
                                    variant="primary"
                                    size="table"
                                    disabled={!canSave || (truck.damagePercent ?? 0) === 0 || !onRepair}
                                    onClick={onRepair}
                                    tooltip="Repair vehicle"
                                />
                            </div>
                            <div style={{ color: "var(--text-secondary)" }}>Accessories: <span style={{ color: "var(--text-primary)" }}>{truck.accessoriesCount}</span></div>
                        </div>
                    )}
                </div>

                <div
                    className="mt-6 rounded-xl"
                    style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
                >
                    <div className="mb-5 flex items-center justify-between gap-3 px-6 pt-6">
                        <div className="flex items-center gap-4">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                Accessories
                            </p>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" style={{ color: "var(--text-primary)" }} />
                                <input
                                    type="text"
                                    placeholder="Search accessories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 w-48 rounded-lg border bg-black/20 pl-9 pr-3 text-xs outline-none focus:border-accent transition-all"
                                    style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 hover:bg-zinc-500/20"
                                    >
                                        <X size={12} style={{ color: "var(--text-secondary)" }} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <SegmentedControl
                                items={accessorySegmentItems}
                                value={accessorySegment}
                                onChange={(id) => setAccessorySegment(id as AccessorySegment)}
                                size="sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-5 pb-6">
                        {Object.entries(displayGroups).map(([blockType, positionGroups]) => (
                            <section key={blockType} className="space-y-3">
                                <div className="space-y-4">
                                    {Object.entries(positionGroups).map(([positionLabel, offsetGroups]) => (
                                        <div key={positionLabel} className="space-y-3">
                                            {positionLabel !== "All" && (
                                                <p className="px-6 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{positionLabel}</p>
                                            )}
                                            {Object.entries(offsetGroups).map(([offsetLabel, groupItems]) => (
                                                <div key={offsetLabel} className="space-y-2">
                                                    {offsetLabel !== "All" && (
                                                        <p className="px-6 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{offsetLabel}</p>
                                                    )}
                                                    <div className="overflow-visible">
                                                        <Table className="table-fixed" showWrapper={false}>
                                                            <colgroup>
                                                                <col className="w-5" />
                                                                <col className="w-[60%]" />
                                                                <col className="w-[23%]" />
                                                                <col className="w-12" />
                                                            </colgroup>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="px-6">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={groupItems.length > 0 && groupItems.every(item => selectedIds.has(item.localId))}
                                                                            onChange={() => toggleAllSelection(groupItems)}
                                                                            className="h-4 w-4 appearance-none rounded border border-zinc-500 bg-transparent checked:bg-emerald-400 checked:border-emerald-400 transition-all cursor-pointer focus:ring-0 focus:ring-offset-0"
                                                                        />
                                                                    </TableHead>
                                                                    <TableHead className="px-2">Path</TableHead>
                                                                    <TableHead>ID</TableHead>
                                                                    <TableHead className="pr-4 text-right">Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {groupItems.map((accessory) => (
                                                                    <TableRow
                                                                        key={accessory.localId}
                                                                        className={`${accessory.status === "deleted" ? "opacity-50" : ""} ${selectedIds.has(accessory.localId) ? "bg-emerald-500/10" : ""}`}
                                                                        onContextMenu={(e) => handleContextMenu(e, accessory)}
                                                                        onDoubleClick={() => openBlockEditor(accessory)}
                                                                    >
                                                                        <TableCell className="pl-6 pr-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedIds.has(accessory.localId)}
                                                                                onChange={() => toggleSelection(accessory.localId)}
                                                                                className="h-4 w-4 appearance-none rounded border border-zinc-500 bg-transparent checked:bg-emerald-400 checked:border-emerald-400 transition-all cursor-pointer focus:ring-0 focus:ring-offset-0"
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="max-w-[520px] px-2">
                                                                            <div className="flex items-center gap-2">
                                                                                {lockedFingerprints.has(accessoryFingerprint(accessory.block_type, accessory.lines)) && (
                                                                                    <Lock size={13} className="shrink-0" style={{ color: "var(--accent)" }} />
                                                                                )}
                                                                                <p className="truncate font-mono text-xs" style={{ color: "var(--text-primary)" }}>{accessory.data_path}</p>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="max-w-[260px]">
                                                                            <p className="truncate font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{accessory.id}</p>
                                                                        </TableCell>
                                                                        <TableCell className="px-0 pr-4 text-right">
                                                                            <div className="flex items-center justify-end">
                                                                                <div className="relative">
                                                                                    <ToolbarButton
                                                                                        icon={MoreVertical}
                                                                                        size="square"
                                                                                        tooltip="More"
                                                                                        onClick={(event) => toggleAccessoryMenu(accessory.localId, event)}
                                                                                    />
                                                                                    {openMenuId === accessory.localId && (
                                                                                        <>
                                                                                            <button
                                                                                                className="fixed inset-0 z-40 cursor-default"
                                                                                                aria-label="Close accessory actions"
                                                                                                onClick={closeAccessoryMenu}
                                                                                            />
                                                                                            <div
                                                                                                className="fixed z-50 w-44 overflow-hidden rounded-xl border p-1 shadow-2xl"
                                                                                                style={{ top: openMenuPosition?.top ?? 0, left: openMenuPosition?.left ?? 0, backgroundColor: "var(--bg-main)", borderColor: "var(--border-subtle)" }}
                                                                                            >
                                                                                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-code hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={() => { openBlockEditor(accessory); setOpenMenuId(null); }}>
                                                                                                <Code2 size={14} /> View/Edit Block
                                                                                            </button>
                                                                                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-code hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={() => copyAccessory(accessory)}>
                                                                                                <Clipboard size={14} /> Copy
                                                                                            </button>
                                                                                            <button disabled={!copiedBlock} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-code ${copiedBlock ? "hover:bg-zinc-500/10" : "cursor-not-allowed opacity-40"}`} style={{ color: "var(--text-primary)" }} onClick={pasteAccessory}>
                                                                                                <Check size={14} /> Paste
                                                                                            </button>
                                                                                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-code hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={() => toggleLock(accessory)}>
                                                                                                {lockedFingerprints.has(accessoryFingerprint(accessory.block_type, accessory.lines)) ? <Unlock size={14} /> : <Lock size={14} />}
                                                                                                {lockedFingerprints.has(accessoryFingerprint(accessory.block_type, accessory.lines)) ? "Unlock" : "Lock"}
                                                                                            </button>
                                                                                            {accessory.status === "deleted" ? (
                                                                                                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-code hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={() => { restoreAccessory(accessory.localId); setOpenMenuId(null); }}>
                                                                                                    <RotateCcw size={14} /> Restore
                                                                                                </button>
                                                                                            ) : (
                                                                                                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-code hover:bg-zinc-500/10" style={{ color: "#f87171" }} onClick={() => { markDeleted(accessory.localId); setOpenMenuId(null); }}>
                                                                                                    <Trash2 size={14} /> Delete
                                                                                                </button>
                                                                                            )}
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>

            {isAddingAccessory && (
                <PopupCodeSEAction
                    accessory={{ id: parsedDraftBlock(newBlockType).id ?? "New accessory", block_type: parsedDraftBlock(newBlockType).blockType, data_path: parseDataPath(parsedDraftBlock(newBlockType).lines) }}
                    draftBlock={draftBlock}
                    blockTypeOptions={ACCESSORY_BLOCK_TYPES}
                    applyLabel="Add Block"
                    onDraftBlockChange={setDraftBlock}
                    onBlockTypeChange={changeNewBlockType}
                    onApply={applyNewAccessory}
                    onClose={() => setIsAddingAccessory(false)}
                />
            )}

            {editingAccessory && (
                <PopupCodeSEAction
                    accessory={editingAccessory}
                    draftBlock={draftBlock}
                    onDraftBlockChange={setDraftBlock}
                    onApply={applyBlockEdit}
                    onClose={() => setEditingAccessoryId(null)}
                />
            )}

            {isEditingLicensePlate && (
                <PopupCodeSEAction
                    accessory={{ id: truck.id, block_type: "license_plate", data_path: truck.id }}
                    draftBlock={draftBlock}
                    applyLabel="Save License"
                    onDraftBlockChange={setDraftBlock}
                    onApply={applyLicensePlateEdit}
                    onClose={() => setIsEditingLicensePlate(false)}
                />
            )}

            {showBackWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
                    <div className="w-full max-w-md rounded-xl border p-5" style={{ backgroundColor: "rgb(var(--panel-dark))", borderColor: "var(--border-subtle)" }}>
                        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Discard unsaved accessory changes?</h2>
                        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                            You have added, edited, or deleted accessory blocks that have not been saved to game.sii.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button className="rounded-lg px-4 py-2 text-sm hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={() => setShowBackWarning(false)}>Stay</button>
                            <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white" onClick={onBack}>Discard</button>
                        </div>
                    </div>
                </div>
            )}

            <ContextMenu
                x={contextMenu?.x || 0}
                y={contextMenu?.y || 0}
                isOpen={!!contextMenu?.isOpen}
                onClose={() => setContextMenu(null)}
                actions={[
                    {
                        label: selectedIds.size > 1 ? `Copy Selected (${selectedIds.size})` : "Copy",
                        icon: Clipboard,
                        onClick: copySelectedAccessories
                    }
                ]}
            />
        </div>
    );
}




