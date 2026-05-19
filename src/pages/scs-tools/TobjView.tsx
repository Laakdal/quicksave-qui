import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Save,
  Image,
  ChevronDown,
} from "lucide-react";
import { SegmentedControl } from "../../components/ui/SegmentedControl";

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

/* ── Select dropdown ───────────────────────────────────────────── */
function SelectField({
  label,
  options,
  value,
  onChange,
  cols = 1,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}) {
  return (
    <div className={`flex items-center gap-4 ${cols > 1 ? "col-span-" + cols : ""}`}>
      <label
        className="text-sm font-semibold w-28 shrink-0"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </label>
      <div className="relative flex-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg px-3 py-2 text-sm bg-black/20 border outline-none focus:border-accent transition-all cursor-pointer"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-zinc-900 text-white">
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
          style={{ color: "var(--text-secondary)" }}
        />
      </div>
    </div>
  );
}

/* ── Toggle Switch ─────────────────────────────────────────────── */
function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all duration-300 ${
          checked ? "bg-accent" : "bg-zinc-700"
        }`}
      >
        <div
          className={`w-4 h-4 bg-black rounded-full shadow-sm transition-transform duration-300 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="text-sm font-semibold"
        style={{ color: checked ? "rgb(var(--accent))" : "var(--text-secondary)" }}
      >
        {checked ? "On" : "Off"}
      </span>
    </div>
  );
}

/* ── TOBJ View ─────────────────────────────────────────────────── */
export function TobjView() {
  const [saveMode, setSaveMode] = useState("binary");
  const [tobjType, setTobjType] = useState("Generic");
  const [addr1, setAddr1] = useState("Clamp to Edge");
  const [addr2, setAddr2] = useState("Clamp to Edge");
  const [filter1, setFilter1] = useState("Default");
  const [filter2, setFilter2] = useState("Linear");
  const [mipMap, setMipMap] = useState("MipMaps");
  const [colorSpace, setColorSpace] = useState("SRGB");
  const [usage, setUsage] = useState("Default");
  const [noCompress, setNoCompress] = useState(false);
  const [noAnisotropic, setNoAnisotropic] = useState(false);
  const [fileName, setFileName] = useState("");

  return (
    <div className="w-full h-full overflow-y-auto p-9">
      <div className="max-w-[1070px] mx-auto space-y-4">
        {/* ── Toolbar ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-center gap-2 rounded-xl p-3"
          style={{
            backgroundColor: "rgb(var(--panel-dark))",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ActionBtn icon={ArrowDownToLine} label="Input" />
          <ActionBtn icon={ArrowUpFromLine} label="Output" disabled />
          <ActionBtn icon={RotateCcw} label="Revert" disabled />
          <VSep />
          <ActionBtn icon={Save} label="Save" primary disabled />

          {/* Save mode segmented */}
          <SegmentedControl
            items={[
              { id: "binary", label: "Binary" },
              { id: "text", label: "Text" },
            ]}
            value={saveMode}
            onChange={setSaveMode}
            size="sm"
          />

          <VSep />

          {/* File name */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              File Name:
            </span>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="filename"
              className="w-40 px-2 py-1.5 rounded-md text-sm bg-black/20 border outline-none focus:border-accent transition-all"
              style={{
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </motion.div>

        {/* ── Path bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-lg px-4 py-2.5 text-sm truncate"
          style={{
            backgroundColor: "rgb(var(--panel-dark))",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          No file loaded
        </motion.div>

        {/* ── Editor Grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-[300px_1fr] gap-4"
        >
          {/* Preview placeholder */}
          <div
            className="rounded-xl flex items-center justify-center aspect-4/3"
            style={{
              backgroundColor: "rgb(var(--panel-dark))",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="text-center opacity-30">
              <Image
                size={48}
                strokeWidth={1}
                className="mx-auto mb-2"
                style={{ color: "var(--text-secondary)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Preview
              </p>
            </div>
          </div>

          {/* Properties */}
          <div className="space-y-3">
            <SelectField
              label="Type"
              options={["Generic", "2D", "Cube"]}
              value={tobjType}
              onChange={setTobjType}
            />
            <div className="flex gap-3">
              <SelectField
                label="Addr"
                options={["Clamp to Edge", "Repeat", "Mirror"]}
                value={addr1}
                onChange={setAddr1}
              />
              <div className="relative flex-1">
                <select
                  value={addr2}
                  onChange={(e) => setAddr2(e.target.value)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm bg-black/20 border outline-none focus:border-accent transition-all cursor-pointer"
                  style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  {["Clamp to Edge", "Repeat", "Mirror"].map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-900 text-white">
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <SelectField
                label="Filter"
                options={["Default", "Nearest", "Linear"]}
                value={filter1}
                onChange={setFilter1}
              />
              <div className="relative flex-1">
                <select
                  value={filter2}
                  onChange={(e) => setFilter2(e.target.value)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm bg-black/20 border outline-none focus:border-accent transition-all cursor-pointer"
                  style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  {["Linear", "Nearest"].map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-900 text-white">
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </div>
            <SelectField
              label="Mip Map"
              options={["MipMaps", "No MipMaps"]}
              value={mipMap}
              onChange={setMipMap}
            />
            <SelectField
              label="Color Space"
              options={["SRGB", "Linear"]}
              value={colorSpace}
              onChange={setColorSpace}
            />
            <SelectField
              label="Usage"
              options={["Default", "UI"]}
              value={usage}
              onChange={setUsage}
            />

            {/* Switches */}
            <div className="flex items-center gap-6 pt-2">
              <span
                className="text-sm font-semibold w-28 shrink-0"
                style={{ color: "var(--text-primary)" }}
              >
                Switch
              </span>
              <ToggleSwitch
                label="No Compress"
                checked={noCompress}
                onChange={setNoCompress}
              />
              <ToggleSwitch
                label="No Anisotropic"
                checked={noAnisotropic}
                onChange={setNoAnisotropic}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Preview panels ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          {["Preview Text", "Preview Binary"].map((title) => (
            <div
              key={title}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "rgb(var(--panel-dark))",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="px-4 py-2.5"
                style={{
                  backgroundColor: "rgb(var(--panel-darker))",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {title}
                </p>
              </div>
              <div className="p-4 min-h-[100px]">
                <p
                  className="text-sm font-mono opacity-40"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No data loaded
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
