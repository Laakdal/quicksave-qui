import { X } from "lucide-react";
import { CodeViewer } from "./CodeViewer";
import { RichDropdown } from "./DropdownBase";

export type PopupCodeAccessory = {
    id: string;
    block_type: string;
    data_path: string;
};

type PopupCodeSEActionProps = {
    accessory: PopupCodeAccessory;
    draftBlock: string;
    blockTypeOptions?: string[];
    applyLabel?: string;
    onDraftBlockChange: (value: string) => void;
    onBlockTypeChange?: (value: string) => void;
    onApply: () => void;
    onClose: () => void;
};

export function PopupCodeSEAction({ accessory, draftBlock, blockTypeOptions, applyLabel = "Apply", onDraftBlockChange, onBlockTypeChange, onApply, onClose }: PopupCodeSEActionProps) {
    const editorLineCount = Math.max(draftBlock.split("\n").length, 1);
    const editorHeight = Math.min(Math.max(editorLineCount * 22 + 48, 140), 420);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-3xl overflow-hidden rounded-xl border" style={{ backgroundColor: "rgb(var(--panel-dark))", borderColor: "var(--border-subtle)" }}>
                <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
                    <div className="min-w-0">
                        {blockTypeOptions && onBlockTypeChange ? (
                            <RichDropdown
                                value={accessory.block_type}
                                options={blockTypeOptions.map((blockType) => ({ id: blockType, label: blockType }))}
                                onChange={onBlockTypeChange}
                                placeholder="Select block type..."
                                triggerMaxWidth="320px"
                                menuMinWidth="320px"
                                menuListMinWidth="280px"
                                menuMaxWidth="380px"
                                menuMaxHeight="260px"
                            />
                        ) : (
                            <p className="font-mono text-sm font-semibold uppercase" style={{ color: "var(--text-primary)" }}>{accessory.block_type}</p>
                        )}
                        {/* <h2 className="mt-1 truncate font-mono text-sm" style={{ color: "var(--text-primary)" }}>{accessory.id}</h2> */}
                        <p className="mt-1 truncate font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{accessory.data_path}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }}>
                        <X size={16} />
                    </button>
                </div>
                <div className="flex flex-col p-5">
                    <CodeViewer
                        value={draftBlock}
                        onChange={onDraftBlockChange}
                        language="ini"
                        height={editorHeight}
                    />
                </div>
                <div className="flex justify-end gap-2 border-t py-3 px-5" style={{ borderColor: "var(--border-subtle)" }}>
                    <button className="rounded-lg px-4 py-2 text-sm hover:bg-zinc-500/10" style={{ color: "var(--text-primary)" }} onClick={onClose}>Cancel</button>
                    <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black" onClick={onApply}>{applyLabel}</button>
                </div>
            </div>
        </div>
    );
}
