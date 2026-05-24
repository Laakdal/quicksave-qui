import { ArrowLeft, HardDrive, Plus, RefreshCw, Save as SaveIcon, User } from "lucide-react";
import { RichDropdown } from "./DropdownBase";
import { SegmentedControl } from "./SegmentedControl";

type ToolbarProfile = {
    id: string;
    name: string;
    path: string;
};

type ToolbarSave = {
    id: string;
    name: string;
    path: string;
};

type ToolbarTab = {
    id: string;
    label: string;
};

type ActionBtnProps = {
    icon: React.ElementType;
    label?: string;
    primary?: boolean;
    disabled?: boolean;
    tooltip?: string;
    onClick?: () => void;
};

type SaveManagerToolbarProps = {
    profiles: ToolbarProfile[];
    activeProfileId: string;
    onProfileChange: (profileId: string) => void;
    saves: ToolbarSave[];
    activeSaveId: string;
    onSaveChange: (saveId: string) => void;
    tabs: ToolbarTab[];
    activeSubTab: string;
    onSubTabChange: (tabId: string) => void;
    isReloading: boolean;
    onRefresh: () => void;
};

type SaveEditToolbarProps = {
    activeProfileName: string;
    activeSaveName: string;
    isReloading: boolean;
    canSave: boolean;
    onAdd: () => void;
    onSave: () => void;
    onRefresh: () => void;
    onBack: () => void;
};

function ActionBtn({
    icon: Icon,
    label,
    primary = false,
    disabled = false,
    tooltip,
    onClick,
}: ActionBtnProps) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            title={tooltip}
            className={`inline-flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 select-none
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-zinc-500/10"}
        ${primary ? "bg-accent text-black hover:bg-accent-hover" : ""}`}
            style={primary ? {} : { color: "var(--text-primary)" }}
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
    return (
        <div
            className="w-px h-7 mx-1 shrink-0"
            style={{ backgroundColor: "var(--border-subtle)" }}
        />
    );
}

export function SaveEditToolbar({
    activeProfileName,
    activeSaveName,
    isReloading,
    canSave,
    onAdd,
    onSave,
    onRefresh,
    onBack,
}: SaveEditToolbarProps) {
    return (
        <div
            className="mb-6 flex flex-wrap items-center rounded-xl p-3"
            style={{ backgroundColor: "rgb(var(--panel-dark))", border: "1px solid var(--border-subtle)" }}
        >
            <div className="flex items-center gap-2">
                <BackButton onClick={onBack} />
                <ToolbarSummary icon={HardDrive} text={activeProfileName} />
                <ToolbarSummary icon={SaveIcon} text={activeSaveName} />
            </div>

            <VSep />

            <div className="flex-1" />

            <VSep />

            <div className="flex items-center gap-2">
                <button
                    onClick={onAdd}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-red-400"
                    style={{ backgroundColor: "#e05252" }}
                >
                    <Plus size={14} strokeWidth={2} /> Add
                </button>
                <ActionBtn
                    icon={SaveIcon}
                    label="Save"
                    disabled={!canSave}
                    onClick={onSave}
                />
                <VSep />
                <ActionBtn icon={RefreshCw} disabled={isReloading} onClick={onRefresh} />
            </div>
        </div>
    );
}

export function SaveManagerToolbar({
    profiles,
    activeProfileId,
    onProfileChange,
    saves,
    activeSaveId,
    onSaveChange,
    tabs,
    activeSubTab,
    onSubTabChange,
    isReloading,
    onRefresh,
}: SaveManagerToolbarProps) {
    return (
        <div
            className="flex flex-wrap items-center rounded-xl p-3 mb-6"
            style={{
                backgroundColor: "rgb(var(--panel-dark))",
                border: "1px solid var(--border-subtle)",
            }}
        >
            <div className="flex items-center gap-2">
                <RichDropdown
                    value={activeProfileId}
                    options={profiles.map((profile) => ({
                        id: profile.id,
                        label: profile.name,
                        description: profile.id,
                    }))}
                    onChange={onProfileChange}
                    placeholder="Active Profile..."
                    icon={<User size={14} className="shrink-0 text-accent" />}
                />
            </div>

            <VSep />

            <div className="flex-1 flex justify-center items-center gap-4">
                <SegmentedControl
                    items={tabs}
                    value={activeSubTab}
                    onChange={onSubTabChange}
                    size="sm"
                />
            </div>

            <VSep />

            <div className="flex items-center gap-2">
                <RichDropdown
                    value={activeSaveId}
                    options={saves.map((save) => ({
                        id: save.id,
                        label: save.name,
                    }))}
                    onChange={onSaveChange}
                    placeholder="Select Save..."
                    icon={<SaveIcon size={14} className="shrink-0 opacity-50" />}
                    triggerMaxWidth="200px"
                    menuMinWidth="200px"
                    menuListMinWidth="180px"
                    menuMaxWidth="240px"
                    menuMaxHeight="300px"
                />

                <div className="w-px h-6 mx-1" style={{ backgroundColor: "var(--border-subtle)" }} />
                <ActionBtn
                    icon={RefreshCw}
                    tooltip="Reload profiles and saves"
                    onClick={onRefresh}
                    disabled={isReloading}
                />
            </div>
        </div>
    );
}
