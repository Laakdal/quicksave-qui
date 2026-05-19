export type SegmentedControlItem = {
  id: string;
  label: string;
};

type SegmentedControlProps = {
  items: SegmentedControlItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: "separated" | "attached";
  size?: "sm" | "md";
};

export function SegmentedControl({
  items,
  value,
  onChange,
  variant = "attached",
  size = "md",
}: SegmentedControlProps) {
  const isSeparated = variant === "separated";
  const buttonSizeClass = size === "sm" ? "px-3 py-1.5" : isSeparated ? "px-6 py-1.5" : "px-5 py-2";
  const containerRadiusClass = size === "sm" ? "rounded-md" : "rounded-lg";

  if (isSeparated) {
    return (
      <div className="flex items-center gap-2">
        {items.map((item) => {
          const active = value === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`${buttonSizeClass} rounded-lg text-sm font-medium transition-all duration-200 border ${
                active
                  ? "bg-accent text-black border-accent shadow-lg shadow-accent/20"
                  : "bg-black/20 border-transparent hover:bg-black/40"
              }`}
              style={{
                borderColor: active ? "var(--accent)" : "var(--border-subtle)",
                color: active ? "black" : "var(--text-secondary)",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex ${containerRadiusClass} overflow-hidden${size === "sm" ? " text-sm" : ""}`}
      style={{
        border: "1px solid var(--border-subtle)",
        backgroundColor: "rgb(var(--panel-darker))",
      }}
    >
      {items.map((item) => {
        const active = value === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`${buttonSizeClass} ${size === "md" ? "text-sm " : ""}font-semibold transition-all ${
              size === "md" ? "duration-200 " : ""
            }select-none ${active ? "bg-accent text-black" : "hover:bg-zinc-500/10"}`}
            style={active ? {} : { color: "var(--text-primary)" }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
