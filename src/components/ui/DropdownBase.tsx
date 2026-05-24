import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { ToolbarDropdownTrigger } from "./ButtonBase";

type RichDropdownOption = { id: string; label: string; description?: string; };
interface RichDropdownProps { value: string; options: RichDropdownOption[]; onChange: (value: string) => void; placeholder: string; icon?: ReactNode; triggerMaxWidth?: string; menuMinWidth?: string; menuListMinWidth?: string; menuMaxWidth?: string; menuMaxHeight?: string; }

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

export function RichDropdown({
  value,
  options,
  onChange,
  placeholder,
  icon,
  triggerMaxWidth = "320px",
  menuMinWidth = "200px",
  menuListMinWidth = "180px",
  menuMaxWidth = "320px",
  menuMaxHeight = "320px",
}: RichDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.id === value);

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

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block w-full" style={{ maxWidth: triggerMaxWidth }}>
      <ToolbarDropdownTrigger
        icon={icon}
        label={selectedOption?.label}
        isOpen={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        placeholder={placeholder}
        maxWidth={triggerMaxWidth}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            role="listbox"
            className="absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-[#1e1e1e] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]"
            style={{ minWidth: menuMinWidth, maxWidth: menuMaxWidth, borderColor: "rgba(255, 255, 255, 0.08)" }}
          >
            <div className="custom-scrollbar space-y-1 overflow-y-auto" style={{ minWidth: menuListMinWidth, maxHeight: menuMaxHeight }}>
              {options.map((option) => {
                const isSelected = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.id)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-500/10 ${isSelected ? "bg-zinc-500/10 text-white" : "text-white"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.label}</span>
                      {option.description && (
                        <span className="mt-0.5 block text-xs leading-snug text-white/45">{option.description}</span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="mt-0.5 shrink-0 text-[#e7dddd]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
