import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  FileText,
} from "lucide-react";

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

/* ── DEF View ──────────────────────────────────────────────────── */
export function DefView() {
  const [defName, setDefName] = useState("");
  const [dirName, setDirName] = useState("");

  const hasInput = false;

  return (
    <div className="w-full h-full overflow-y-auto p-9">
      <div className="max-w-[1070px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl p-5"
          style={{
            backgroundColor: "rgb(var(--panel-dark))",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="text-sm font-bold text-center mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Accessory DEF Creator
          </p>

          {/* ── Toolbar ── */}
          <div
            className="flex flex-wrap items-center gap-2 rounded-lg p-3 mb-5"
            style={{
              backgroundColor: "rgb(var(--panel-darker))",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <ActionBtn icon={ArrowDownToLine} label="Input" />
            <ActionBtn
              icon={ArrowUpFromLine}
              label="Output"
              disabled={!hasInput}
            />
            <VSep />
            <ActionBtn
              icon={Plus}
              label="Create"
              primary
              disabled={!hasInput}
            />
          </div>

          {/* ── Properties ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label
                className="text-sm font-semibold w-32 shrink-0"
                style={{ color: "var(--text-primary)" }}
              >
                DEF Name
              </label>
              <input
                type="text"
                value={defName}
                onChange={(e) => setDefName(e.target.value)}
                placeholder="e.g., my_accessory"
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-black/20 border outline-none focus:border-accent transition-all"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <label
                className="text-sm font-semibold w-32 shrink-0"
                style={{ color: "var(--text-primary)" }}
              >
                Directory Name
              </label>
              <input
                type="text"
                value={dirName}
                onChange={(e) => setDirName(e.target.value)}
                placeholder="e.g., custom_parts"
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-black/20 border outline-none focus:border-accent transition-all"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* ── Output preview ── */}
          <div
            className="mt-5 rounded-lg min-h-[200px] flex items-center justify-center"
            style={{
              backgroundColor: "rgb(var(--panel-darker))",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="text-center opacity-30">
              <FileText
                size={40}
                strokeWidth={1}
                className="mx-auto mb-2"
                style={{ color: "var(--text-secondary)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Select an input directory to preview generated DEF files
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
