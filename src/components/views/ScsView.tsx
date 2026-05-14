import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Link,
  PackagePlus,
} from "lucide-react";

/* ── Shared card wrapper ───────────────────────────────────────── */
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

/* ── Action Button ─────────────────────────────────────────────── */
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
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5 active:translate-y-0"}
        ${
          primary
            ? "bg-accent text-black hover:bg-accent-hover"
            : ""
        }`}
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

/* ── Separator ─────────────────────────────────────────────────── */
function VSep() {
  return (
    <div
      className="w-px h-7 mx-1 shrink-0"
      style={{ backgroundColor: "var(--border-subtle)" }}
    />
  );
}

/* ── SCS Extractor ─────────────────────────────────────────────── */
function ScsExtractor() {
  const [inputFile] = useState("");
  const [ioBufferEnabled, setIoBufferEnabled] = useState(false);
  const [ioBufferSize, setIoBufferSize] = useState(10);

  const hasInput = inputFile.length > 0;

  return (
    <ToolCard title="Extractor">
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{
          backgroundColor: "rgb(var(--panel-darker))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <ActionBtn icon={ArrowDownToLine} label="Input" onClick={() => {}} />
        <ActionBtn
          icon={ArrowUpFromLine}
          label="Output"
          disabled={!hasInput}
        />
        <VSep />
        <ActionBtn icon={Link} label="Extract" primary disabled={!hasInput} />
        <VSep />

        {/* IO Buffer checkbox */}
        <label className="inline-flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={ioBufferEnabled}
            onChange={(e) => setIoBufferEnabled(e.target.checked)}
            className="accent-[rgb(var(--accent))] w-3.5 h-3.5"
            disabled={!hasInput}
          />
          IO Buffer Size
        </label>

        {/* Spinbox */}
        <div className="relative">
          <input
            type="number"
            min={10}
            max={6144}
            step={100}
            value={ioBufferSize}
            disabled={!ioBufferEnabled || !hasInput}
            onChange={(e) => setIoBufferSize(Number(e.target.value))}
            className="w-24 px-2 py-1.5 rounded-md text-sm bg-black/20 border outline-none focus:border-accent transition-all disabled:opacity-40"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: "var(--text-secondary)" }}
          >
            MB
          </span>
        </div>
      </div>
    </ToolCard>
  );
}

/* ── SCS Packer ────────────────────────────────────────────────── */
function ScsPacker() {
  const [inputFolder] = useState("");
  const [noCompress, setNoCompress] = useState(false);

  const hasInput = inputFolder.length > 0;

  return (
    <ToolCard title="Packer">
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{
          backgroundColor: "rgb(var(--panel-darker))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <ActionBtn icon={ArrowDownToLine} label="Input" onClick={() => {}} />
        <ActionBtn icon={ArrowUpFromLine} label="Output" disabled={!hasInput} />
        <VSep />
        <ActionBtn
          icon={PackagePlus}
          label="Pack"
          primary
          disabled={!hasInput}
        />
        <VSep />

        <label className="inline-flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={noCompress}
            onChange={(e) => setNoCompress(e.target.checked)}
            className="accent-[rgb(var(--accent))] w-3.5 h-3.5"
            disabled={!hasInput}
          />
          No compress
        </label>
      </div>
    </ToolCard>
  );
}

/* ── Main View ─────────────────────────────────────────────────── */
export function ScsView() {
  return (
    <div className="w-full h-full overflow-y-auto p-9">
      <div className="max-w-[1070px] mx-auto space-y-5">
        <ScsExtractor />
        <ScsPacker />
      </div>
    </div>
  );
}
