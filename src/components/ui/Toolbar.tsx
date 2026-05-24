import { ArrowLeft, HardDrive, Plus, Save as SaveIcon, User } from "lucide-react";
import { ToolbarButton, ToolbarSummary, ToolbarReloadButton } from "./ButtonBase";
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
                <ToolbarButton icon={ArrowLeft} size="square" tooltip="Back" onClick={onBack} />
                <ToolbarSummary icon={HardDrive} text={activeProfileName} />
                <ToolbarSummary icon={SaveIcon} text={activeSaveName} />
            </div>

            <VSep />

            <div className="flex-1" />

            <VSep />

            <div className="flex items-center gap-2">
                <ToolbarButton icon={Plus} label="Add" variant="danger" onClick={onAdd} />
                <ToolbarButton
                    icon={SaveIcon}
                    label="Save"
                    disabled={!canSave}
                    onClick={onSave}
                />
                <VSep />
                <ToolbarReloadButton isReloading={isReloading} onClick={onRefresh} />
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

                <VSep />
                <ToolbarReloadButton
                    isReloading={isReloading}
                    onClick={onRefresh}
                    tooltip="Reload profiles and saves"
                />
            </div>
        </div>
    );
}
