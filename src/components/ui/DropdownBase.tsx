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

  const selectedIndex = Math.max(0, options.indexOf(value));
  const longestOptionLength = Math.max(value.length, ...options.map((option) => option.length));
  const dropdownWidth = `max(100%, ${Math.min(Math.max(longestOptionLength + 4, 12), 34)}ch)`;

  return (
    <div ref={dropdownRef} className="relative inline-block min-w-32">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex h-8 w-full items-center justify-between gap-4 rounded-md border bg-black/20 px-3 text-left text-sm outline-none transition-colors hover:bg-black/30 focus:border-accent"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 z-50 overflow-hidden rounded-lg border bg-[#1b1b1b] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]"
          style={{ top: `-${selectedIndex * 32 + 6}px`, width: dropdownWidth, borderColor: "rgba(255, 255, 255, 0.08)" }}
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
                className={`relative flex h-8 w-full items-center rounded-md py-0 pl-4 pr-3 text-left text-sm transition-colors hover:bg-white/8 ${isSelected ? "bg-white/10 text-white" : "text-white"}`}
              >
                {isSelected && <span className="absolute left-1.5 top-1/2 h-5 -translate-y-1/2 rounded-full border-l-2 border-[#e7dddd]" />}
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
