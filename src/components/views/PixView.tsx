import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Link,
  Home,
  ArrowLeft,
  RefreshCw,
  Folder,
  FileIcon,
  Film,
} from "lucide-react";

/* ── Shared Action Button ──────────────────────────────────────── */
function ActionBtn({
  icon: Icon,
  label,
  primary = false,
  disabled = false,
  tooltip,
  onClick,
}: {
  icon: React.ElementType;
  label?: string;
  primary?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 select-none
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5 active:translate-y-0"}
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

/* ── Segmented Tabs ────────────────────────────────────────────── */
function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--border-subtle)",
        backgroundColor: "rgb(var(--panel-darker))",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-5 py-2 text-sm font-semibold transition-all duration-200 select-none ${
            active === tab.id
              ? "bg-accent text-black"
              : "hover:bg-zinc-500/10"
          }`}
          style={
            active !== tab.id ? { color: "var(--text-primary)" } : {}
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── PIX Converter Sub-view ────────────────────────────────────── */
function PixConverterPanel() {
  const [extractMode, setExtractMode] = useState("model");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl p-3"
        style={{
          backgroundColor: "rgb(var(--panel-dark))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <ActionBtn icon={Download} label="Download" primary />
        <ActionBtn icon={ArrowDownToLine} label="Input" disabled />
        <ActionBtn icon={ArrowUpFromLine} label="Output" disabled />
        <ActionBtn icon={RotateCcw} tooltip="Reset input archives" disabled />
        <VSep />
        <ActionBtn icon={Link} label="Extract" primary disabled />

        {/* Extract mode segmented */}
        <div
          className="inline-flex rounded-md overflow-hidden text-sm"
          style={{
            border: "1px solid var(--border-subtle)",
            backgroundColor: "rgb(var(--panel-darker))",
          }}
        >
          {["File", "Model", "TOBJ", "Folder"].map((mode) => (
            <button
              key={mode}
              onClick={() => setExtractMode(mode.toLowerCase())}
              className={`px-3 py-1.5 font-semibold transition-all select-none ${
                extractMode === mode.toLowerCase()
                  ? "bg-accent text-black"
                  : "hover:bg-zinc-500/10"
              }`}
              style={
                extractMode !== mode.toLowerCase()
                  ? { color: "var(--text-primary)" }
                  : {}
              }
            >
              {mode}
            </button>
          ))}
        </div>

        <VSep />

        {/* Toggle buttons */}
        <ActionBtn icon={Film} tooltip="Include animation" disabled />
        <ActionBtn icon={FileIcon} tooltip="Past 1.47 material config" disabled />
        <ActionBtn icon={FileIcon} tooltip="Use dxt10 format" disabled />
      </div>

      {/* Breadcrumb nav bar */}
      <div className="flex items-center gap-2">
        <ActionBtn icon={Home} tooltip="Go to home directory" disabled />
        <ActionBtn icon={ArrowLeft} disabled />
        <div
          className="flex-1 rounded-lg px-4 py-2 text-sm truncate"
          style={{
            backgroundColor: "rgb(var(--panel-dark))",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          No archive loaded
        </div>
        <ActionBtn icon={RefreshCw} tooltip="Refresh current directory" disabled />
      </div>

      {/* Three-column file browser */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Folder", icon: Folder, count: 0 },
          { label: "Model", icon: FileIcon, count: 0 },
          { label: "Anim", icon: Film, count: 0 },
        ].map((col) => (
          <div
            key={col.label}
            className="rounded-xl flex flex-col min-h-[300px]"
            style={{
              backgroundColor: "rgb(var(--panel-dark))",
              border: "1px solid var(--border-subtle)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-t-xl"
              style={{
                backgroundColor: "rgb(var(--panel-darker))",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {col.label}
              </p>
              <span
                className="text-sm font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(var(--accent), 0.15)",
                  color: "rgb(var(--accent))",
                }}
              >
                {col.count}
              </span>
            </div>
            {/* Empty state */}
            <div className="flex-1 flex items-center justify-center">
              <p
                className="text-sm opacity-40"
                style={{ color: "var(--text-secondary)" }}
              >
                No items
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── PIX Anim Finder Sub-view ──────────────────────────────────── */
function PixAnimFinderPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center h-[400px]"
    >
      <div className="text-center opacity-50">
        <Film size={40} strokeWidth={1} className="mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Anim Finder</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Select an archive to scan for animations.</p>
      </div>
    </motion.div>
  );
}

/* ── PIX Hasher Sub-view ───────────────────────────────────────── */
function PixHasherPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center h-[400px]"
    >
      <div className="text-center opacity-50">
        <FileIcon size={40} strokeWidth={1} className="mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Hasher</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Hash file paths or strings.</p>
      </div>
    </motion.div>
  );
}

/* ── Main PIX View ─────────────────────────────────────────────── */
export function PixView() {
  const [activeSubTab, setActiveSubTab] = useState("converter");

  const tabs = [
    { id: "converter", label: "Converter" },
    { id: "anim-finder", label: "Anim Finder" },
    { id: "hasher", label: "Hasher" },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-9">
      <div className="max-w-[1070px] mx-auto">
        {/* Centered segmented tabs */}
        <div className="flex justify-center mb-6">
          <SegmentedTabs
            tabs={tabs}
            active={activeSubTab}
            onChange={setActiveSubTab}
          />
        </div>

        <AnimatePresence mode="wait">
          {activeSubTab === "converter" && <PixConverterPanel key="converter" />}
          {activeSubTab === "anim-finder" && <PixAnimFinderPanel key="anim-finder" />}
          {activeSubTab === "hasher" && <PixHasherPanel key="hasher" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
