import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Code2, HardDrive, RefreshCw, RotateCcw, Save as SaveIcon, Trash2, X } from "lucide-react";
import { ColorPicker } from "../../components/ui/ColorPicker";
import { SegmentedControl } from "../../components/ui/SegmentedControl";

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
type AccessorySegment = "all" | "wheels" | "paint" | "other";

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
    onRefresh: () => void;
    onBack: () => void;
}

function ToolbarButton({ icon: Icon, label, disabled = false, onClick }: { icon: React.ElementType; label?: string; disabled?: boolean; onClick?: () => void }) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-zinc-500/10"}`}
            style={{ color: "var(--text-primary)", backgroundColor: "rgba(var(--zinc-700), 0.5)" }}
        >
            <Icon size={14} strokeWidth={2} />
            {label}
        </button>
    );
}

function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-zinc-500/15"
            style={{ color: "var(--text-primary)" }}
            title="Back"
        >
            <ArrowLeft size={15} strokeWidth={2} />
        </button>
    );
}

function ToolbarSummary({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <div
            className="flex max-w-[320px] items-center gap-2 rounded-lg border bg-black/20 px-3 py-1.5 text-sm"
            style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
        >
            <Icon size={14} className="shrink-0 opacity-60" />
            <span className="truncate">{text}</span>
        </div>
    );
}

function VSep() {
    return <div className="mx-1 h-7 w-px shrink-0" style={{ backgroundColor: "var(--border-subtle)" }} />;
}

function TableActionButton({ icon: Icon, label, tone = "accent", onClick }: { icon: React.ElementType; label: string; tone?: "accent" | "danger" | "primary"; onClick: () => void }) {
    const color = tone === "danger" ? "#f87171" : tone === "accent" ? "var(--accent)" : "var(--text-primary)";

    return (
        <button
            onClick={onClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:-translate-y-0.5 hover:bg-zinc-500/10"
            style={{ color, borderColor: "var(--border-subtle)" }}
            title={label}
        >
            <Icon size={15} strokeWidth={2} />
        </button>
    );
}

type AccessoryDisplayGroups = Record<string, Record<string, Record<string, EditableTruckAccessory[]>>>;

export function filterAccessoriesBySegment(accessories: EditableTruckAccessory[], segment: AccessorySegment) {
    if (segment === "wheels") return accessories.filter((accessory) => accessory.block_type === "vehicle_wheel_accessory");
    if (segment === "paint") return accessories.filter((accessory) => accessory.block_type === "vehicle_paint_job_accessory");
    if (segment === "other") return accessories.filter((accessory) => !["vehicle_wheel_accessory", "vehicle_paint_job_accessory"].includes(accessory.block_type));
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


export function SaveEditAction({ truck, activeProfileName, activeSaveName, isReloading, canSave, onSave, onRefresh, onBack }: SaveEditActionProps) {
    const [accessories, setAccessories] = useState<EditableTruckAccessory[]>(() => truck.accessories.map((accessory) => ({
        ...accessory,
        localId: accessory.id,
        status: "unchanged",
    })));
    const [editingAccessoryId, setEditingAccessoryId] = useState<string | null>(null);
    const [draftBlock, setDraftBlock] = useState("");
    const [showBackWarning, setShowBackWarning] = useState(false);
    const [colorEdit, setColorEdit] = useState<{ accessoryId: string; field: string; value: string } | null>(null);
    const [isTruckInfoOpen, setIsTruckInfoOpen] = useState(true);
    const [accessorySegment, setAccessorySegment] = useState<AccessorySegment>("all");

    useEffect(() => {
        setAccessories(truck.accessories.map((accessory) => ({
            ...accessory,
            localId: accessory.id,
            status: "unchanged",
        })));
        setEditingAccessoryId(null);
        setDraftBlock("");
    }, [truck.id, truck.accessories]);

    const filteredAccessories = useMemo(() => filterAccessoriesBySegment(accessories, accessorySegment), [accessories, accessorySegment]);
    const groupedAccessories = useMemo(() => groupAccessoriesForDisplay(filteredAccessories), [filteredAccessories]);
    const editingAccessory = accessories.find((accessory) => accessory.localId === editingAccessoryId) || null;
    const hasUnsavedChanges = accessories.some((accessory) => accessory.status !== "unchanged");

    const clampColorComponent = (value: number) => Math.max(0, Math.min(255, value));

    const parseRgbTuple = (value: string) => {
        const decimalNumber = String.raw`[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?`;
        const match = new RegExp(String.raw`^\(\s*(${decimalNumber})\s*,\s*(${decimalNumber})\s*,\s*(${decimalNumber})\s*\)$`).exec(value.trim());
        if (!match) return null;
        return match
            .slice(1)
            .map((part) => clampColorComponent(Math.round(Number(part) * 255)))
            .join(" ");
    };

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const applyRgbTuple = (accessoryId: string, field: string, r: number, g: number, b: number) => {
        const nextValue = `(${(r / 255).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}, ${(g / 255).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}, ${(b / 255).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})`;
        const fieldPattern = new RegExp(`^\\s*${escapeRegExp(field)}\\s*:`);
        setAccessories((current) => current.map((accessory) => {
            if (accessory.localId !== accessoryId) return accessory;
            return {
                ...accessory,
                lines: accessory.lines.map((line) => fieldPattern.test(line) ? `${field}: ${nextValue}` : line),
                paint_colors: { ...accessory.paint_colors, [field]: nextValue },
                status: accessory.status === "added" ? "added" : "edited",
            };
        }));
    };

    const openBlockEditor = (accessory: EditableTruckAccessory) => {
        setEditingAccessoryId(accessory.localId);
        setDraftBlock(accessory.lines.join("\n"));
    };

    const applyBlockEdit = () => {
        if (!editingAccessory) return;

        const bodyLines = draftBlock.split("\n").map((line) => line.trim()).filter(Boolean);

        setAccessories((current) => current.map((accessory) => {
            if (accessory.localId !== editingAccessory.localId) return accessory;
            return {
                ...accessory,
                lines: bodyLines,
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
            accessory.localId === localId ? { ...accessory, status: "unchanged" } : accessory
        )));
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
                <div
                    className="mb-6 flex flex-wrap items-center rounded-xl p-3"
                    style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
                >
                    <div className="flex items-center gap-2">
                        <BackButton onClick={handleBack} />
                        <ToolbarSummary icon={HardDrive} text={activeProfileName} />
                        <ToolbarSummary icon={SaveIcon} text={activeSaveName} />
                    </div>

                    <VSep />

                    <div className="flex-1" />

                    <VSep />

                    <div className="flex items-center gap-2">
                        <ToolbarButton
                            icon={SaveIcon}
                            label="Save"
                            disabled={!canSave}
                            onClick={async () => {
                                const changes = accessories
                                    .filter((accessory) => accessory.status !== "unchanged")
                                    .map((accessory) => ({
                                        id: accessory.id.startsWith("temp-") ? null : accessory.id,
                                        block_type: accessory.block_type,
                                        lines: accessory.lines,
                                        status: accessory.status,
                                    }));

                                await onSave(changes);

                                setAccessories((current) => current
                                    .filter((accessory) => accessory.status !== "deleted")
                                    .map((accessory) => ({ ...accessory, status: "unchanged" })));
                            }}
                        />
                        <VSep />
                        <ToolbarButton icon={RefreshCw} disabled={isReloading} onClick={onRefresh} />
                    </div>
                </div>

                <div
                    className="overflow-hidden rounded-xl"
                    style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
                >
                    <button
                        className="flex w-full items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-zinc-500/5"
                        onClick={() => setIsTruckInfoOpen((open) => !open)}
                    >
                        <div className="min-w-0">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                                Truck Information
                            </p>
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
                            <div style={{ color: "var(--text-secondary)" }}>Brand: <span style={{ color: "var(--text-primary)" }}>{truck.brand}</span></div>
                            <div style={{ color: "var(--text-secondary)" }}>License Plate: <span style={{ color: "var(--text-primary)" }}>{truck.licensePlate}</span></div>
                            <div style={{ color: "var(--text-secondary)" }}>Garage: <span style={{ color: "var(--text-primary)" }}>{truck.garage.replace("garage.", "").replace(/^\w/, (c) => c.toUpperCase())}</span></div>
                            <div style={{ color: "var(--text-secondary)" }}>Accessories: <span style={{ color: "var(--text-primary)" }}>{truck.accessoriesCount}</span></div>
                        </div>
                    )}
                </div>

                <div
                    className="mt-6 rounded-xl p-6"
                    style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
                >
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                            Accessories
                        </p>
                        <SegmentedControl
                            items={[
                                { id: "all", label: "All" },
                                { id: "wheels", label: "Wheels" },
                                { id: "paint", label: "Paint" },
                                { id: "other", label: "Other" },
                            ]}
                            value={accessorySegment}
                            onChange={(id) => setAccessorySegment(id as AccessorySegment)}
                            size="sm"
                        />
                    </div>

                    <div className="space-y-5">
                        {Object.entries(groupedAccessories).map(([blockType, positionGroups]) => (
                            <section key={blockType} className="space-y-3">
                                <div className="space-y-4">
                                    {Object.entries(positionGroups).map(([positionLabel, offsetGroups]) => (
                                        <div key={positionLabel} className="space-y-3">
                                            {positionLabel !== "All" && (
                                                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{positionLabel}</p>
                                            )}
                                            {Object.entries(offsetGroups).map(([offsetLabel, groupItems]) => (
                                                <div key={offsetLabel} className="space-y-2">
                                                    {offsetLabel !== "All" && (
                                                        <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{offsetLabel}</p>
                                                    )}
                                                    <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border-subtle)" }}>
                                                        <table className="w-full border-collapse text-left text-sm">
                                                            <thead>
                                                                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                                                    <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>Path</th>
                                                                    <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>ID</th>
                                                                    <th className="w-28 px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {groupItems.map((accessory) => (
                                                                    <tr
                                                                        key={accessory.localId}
                                                                        className={`transition-colors hover:bg-zinc-500/5 ${accessory.status === "deleted" ? "opacity-50" : ""}`}
                                                                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                                                    >
                                                                        <td className="max-w-[520px] px-4 py-3">
                                                                            <p className="truncate font-mono text-xs" style={{ color: "var(--text-primary)" }}>{accessory.data_path}</p>
                                                                        </td>
                                                                        <td className="max-w-[260px] px-4 py-3">
                                                                            <p className="truncate font-mono text-micro" style={{ color: "var(--text-secondary)" }}>{accessory.id}</p>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                {accessory.block_type === "vehicle_paint_job_accessory" && Object.entries(accessory.paint_colors).map(([field, value]) => {
                                                                                    const pickerValue = parseRgbTuple(value);
                                                                                    if (!pickerValue) return null;
                                                                                    return (
                                                                                        <TableActionButton
                                                                                            key={field}
                                                                                            icon={Code2}
                                                                                            label={field}
                                                                                            onClick={() => setColorEdit({ accessoryId: accessory.localId, field, value: pickerValue })}
                                                                                        />
                                                                                    );
                                                                                })}
                                                                                <TableActionButton icon={Code2} label="View/Edit Block" tone="primary" onClick={() => openBlockEditor(accessory)} />
                                                                                {accessory.status === "deleted" ? (
                                                                                    <TableActionButton icon={RotateCcw} label="Restore" onClick={() => restoreAccessory(accessory.localId)} />
                                                                                ) : (
                                                                                    <TableActionButton icon={Trash2} label="Delete" tone="danger" onClick={() => markDeleted(accessory.localId)} />
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
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

            {editingAccessory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
                    <div className="w-full max-w-3xl overflow-hidden rounded-xl border" style={{ backgroundColor: "rgb(var(--panel-dark))", borderColor: "var(--border-subtle)" }}>
                        <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
                            <div className="min-w-0">
                                <p className="font-mono text-xs font-semibold uppercase" style={{ color: "var(--text-secondary)" }}>{editingAccessory.block_type}</p>
                                <h2 className="mt-1 truncate font-mono text-sm" style={{ color: "var(--text-primary)" }}>{editingAccessory.id}</h2>
                                <p className="mt-1 truncate font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{editingAccessory.data_path}</p>
                            </div>
                            <button onClick={() => setEditingAccessoryId(null)} className="rounded-lg p-2 hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="mb-3 rounded-lg border bg-black/20 p-3 font-mono text-xs" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}>
                                <div style={{ color: "var(--text-primary)" }}>{editingAccessory.block_type} : {editingAccessory.id} {"{"}</div>
                                <div className="mt-1">Body lines only</div>
                            </div>
                            <textarea
                                value={draftBlock}
                                onChange={(event) => setDraftBlock(event.target.value)}
                                className="h-72 w-full resize-none rounded-lg border bg-black/30 p-4 font-mono text-xs outline-none focus:border-accent"
                                style={{ color: "#86efac", borderColor: "var(--border-subtle)" }}
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t p-5" style={{ borderColor: "var(--border-subtle)" }}>
                            <button className="rounded-lg px-4 py-2 text-sm hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={() => setEditingAccessoryId(null)}>Cancel</button>
                            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black" onClick={applyBlockEdit}>Apply</button>
                        </div>
                    </div>
                </div>
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

            {colorEdit && (
                <ColorPicker
                    isOpen={Boolean(colorEdit)}
                    initialColor={colorEdit.value}
                    onClose={() => setColorEdit(null)}
                    onApply={(r, g, b) => {
                        applyRgbTuple(colorEdit.accessoryId, colorEdit.field, r, g, b);
                        setColorEdit(null);
                    }}
                />
            )}
        </div>
    );
}




