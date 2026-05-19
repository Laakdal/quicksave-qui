import { motion } from "framer-motion";
import {
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  PackagePlus,
  FolderSearch,
} from "lucide-react";

/* ── Shared helpers ────────────────────────────────────────────── */
function ActionBtn({
  icon: Icon,
  label,
  primary = false,
  disabled = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 select-none
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}
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

function ToolCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-xl p-5"
      style={{
        backgroundColor: "rgb(var(--panel-dark))",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <p
        className="text-sm font-bold text-center mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </p>
      {children}
    </motion.div>
  );
}

/* ── SXC Finder ────────────────────────────────────────────────── */
function SxcFinder() {
  return (
    <ToolCard title="Finder">
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{
          backgroundColor: "rgb(var(--panel-darker))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <ActionBtn icon={Download} label="Download" primary />
        <ActionBtn icon={ArrowDownToLine} label="Input" disabled />
        <ActionBtn icon={ArrowUpFromLine} label="Output" disabled />
        <VSep />
        <ActionBtn icon={Search} label="Find" primary disabled />
      </div>

      {/* Results area */}
      <div
        className="mt-4 rounded-lg min-h-[200px] flex items-center justify-center"
        style={{
          backgroundColor: "rgb(var(--panel-darker))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="text-center opacity-40">
          <FolderSearch
            size={32}
            strokeWidth={1}
            className="mx-auto mb-2"
            style={{ color: "var(--text-secondary)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No search results yet
          </p>
        </div>
      </div>
    </ToolCard>
  );
}

/* ── SXC Packer ────────────────────────────────────────────────── */
function SxcPacker() {
  return (
    <ToolCard title="Packer">
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{
          backgroundColor: "rgb(var(--panel-darker))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <ActionBtn icon={ArrowDownToLine} label="Input" />
        <ActionBtn icon={ArrowUpFromLine} label="Output" disabled />
        <VSep />
        <ActionBtn icon={PackagePlus} label="Pack" primary disabled />
      </div>
    </ToolCard>
  );
}

/* ── Main View ─────────────────────────────────────────────────── */
export function SxcView() {
  return (
    <div className="w-full h-full overflow-y-auto p-9">
      <div className="max-w-[1070px] mx-auto space-y-5">
        <SxcFinder />
        <SxcPacker />
      </div>
    </div>
  );
}
