interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{checked ? "On" : "Off"}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all duration-300 ${checked ? "bg-accent" : "bg-zinc-700"
          }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? "translate-x-4" : "translate-x-0"
            }`}
        />
      </div>
    </div>
  );
}
