import React, { useEffect, useRef } from "react";

interface ContextMenuAction {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    isOpen: boolean;
    onClose: () => void;
    actions: ContextMenuAction[];
}

export function ContextMenu({ x, y, isOpen, onClose, actions }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Adjust position to keep menu within viewport
    const menuWidth = 176; // w-44
    const menuHeight = actions.length * 36 + 8; // approx height
    const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
    const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-44 overflow-hidden rounded-xl border p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: adjustedY,
                left: adjustedX,
                backgroundColor: "var(--bg-main)",
                borderColor: "var(--border-subtle)",
            }}
        >
            {actions.map((action, index) => (
                <button
                    key={index}
                    disabled={action.disabled}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        action.disabled 
                            ? "opacity-40 cursor-not-allowed" 
                            : action.danger 
                                ? "hover:bg-red-500/10 text-red-400" 
                                : "hover:bg-zinc-500/10 text-[var(--text-primary)]"
                    }`}
                    onClick={() => {
                        action.onClick();
                        onClose();
                    }}
                >
                    {action.icon && <action.icon size={14} />}
                    {action.label}
                </button>
            ))}
        </div>
    );
}
