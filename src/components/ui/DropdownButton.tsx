import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface SelectDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SelectDropdown({ value, options, onChange }: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative min-w-28">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 rounded-lg border bg-black/20 py-1.5 pl-3 pr-2 text-left text-sm outline-none transition-all hover:bg-black/30 focus:border-accent"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      >
        <span>{value}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 opacity-50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-xl border bg-[#1b1b1b] py-2 shadow-[0_18px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]"
          style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}
        >
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={`relative mx-1.5 block w-[calc(100%-0.75rem)] rounded-md px-3 py-2.5 pl-4 text-left text-sm font-medium text-white transition-colors hover:bg-white/8 ${isSelected ? "bg-white/10" : ""}`}
              >
                {isSelected && <span className="absolute left-1.5 top-1/2 h-4 -translate-y-1/2 rounded-full border-l-2 border-white/80" />}
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
