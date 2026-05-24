import React from "react";
import { ChevronDown, RefreshCw } from "lucide-react";

type ToolbarButtonVariant = "default" | "primary" | "danger";
type ToolbarButtonSize = "default" | "square" | "table";
type ToolbarButtonTone = "default" | "accent" | "success";

type ToolbarButtonProps = {
    icon: React.ElementType;
    label?: string;
    variant?: ToolbarButtonVariant;
    size?: ToolbarButtonSize;
    tone?: ToolbarButtonTone;
    disabled?: boolean;
    tooltip?: string;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export function ToolbarButton({
    icon: Icon,
    label,
    variant = "default",
    size = "default",
    tone = "default",
    disabled = false,
    tooltip,
    className = "",
    onClick,
}: ToolbarButtonProps) {
    const isPrimary = variant === "primary";
    const isDanger = variant === "danger";
    const isSquare = size === "square" || size === "table" || !label;
    const color = tone === "accent" ? "var(--accent)" : tone === "success" ? "#34d399" : "var(--text-primary)";

    return (
        <button
            disabled={disabled}
            onClick={onClick}
            title={tooltip}
            className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors duration-200 select-none
        ${isSquare ? "h-8 w-8 shrink-0" : isDanger ? "px-4 py-2" : "px-2 py-2"}
        ${disabled ? "opacity-40 cursor-not-allowed" : isDanger ? "cursor-pointer hover:bg-red-400" : "cursor-pointer hover:bg-zinc-500/10"}
        ${isPrimary ? "bg-accent text-black hover:bg-accent-hover" : ""}
        ${isDanger ? "text-black" : ""}
        ${className}`}
            style={isPrimary ? {} : isDanger ? { backgroundColor: "#e05252" } : { color }}
        >
            <Icon size={15} strokeWidth={2} />
            {label}
        </button>
    );
}

export function ToolbarSummary({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
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

export function ToolbarDropdownTrigger({
    icon,
    label,
    isOpen,
    onClick,
    placeholder,
    maxWidth = "200px"
}: {
    icon?: React.ReactNode;
    label?: string;
    isOpen: boolean;
    onClick: () => void;
    placeholder: string;
    maxWidth?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-sm border outline-none focus:border-accent transition-all cursor-pointer hover:bg-zinc-500/10 select-none"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)", maxWidth }}
        >
            <span className="flex min-w-0 items-center gap-2">
                {icon && <span className="shrink-0" style={{ color: "var(--text-secondary)" }}>{icon}</span>}
                <span className={`truncate ${label ? "" : "text-white/45"}`}>{label ?? placeholder}</span>
            </span>
            <ChevronDown
                size={14}
                className={`shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--text-secondary)" }}
            />
        </button>
    );
}

export function ToolbarReloadButton({ 
    isReloading, 
    onClick, 
    tooltip = "Reload" 
}: { 
    isReloading: boolean; 
    onClick: () => void; 
    tooltip?: string;
}) {
    return (
        <ToolbarButton
            icon={RefreshCw}
            size="square"
            tooltip={tooltip}
            onClick={onClick}
            disabled={isReloading}
            className={isReloading ? "animate-spin" : ""}
        />
    );
}
