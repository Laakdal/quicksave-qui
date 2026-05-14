import { getCurrentWindow } from "@tauri-apps/api/window";
import { Menu, Minus, Square, X } from "lucide-react";

interface TitlebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
}

export function Titlebar({ setIsSidebarOpen }: TitlebarProps) {
  const handleMinimize = async () => {
    const win = getCurrentWindow();
    await win.minimize().catch(e => console.error("minimize error:", e));
  };

  const handleMaximize = async () => {
    const win = getCurrentWindow();
    await win.toggleMaximize().catch(e => console.error("maximize error:", e));
  };

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.close().catch(e => console.error("close error:", e));
  };

  return (
    <header 
      className="relative flex items-center h-10 shrink-0 z-50 transition-all duration-300 select-none"
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
    >
      {/* Left controls */}
      <div className="flex items-center gap-2 pl-3 pr-4 h-full">
        <button
          onClick={() => setIsSidebarOpen((o: boolean) => !o)}
          className="p-1 rounded hover:bg-zinc-500/10 transition-colors pointer-events-auto"
          style={{ color: 'var(--text-secondary)' }}
          title="Toggle sidebar"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        {/* App icon + name */}
        <div className="flex items-center gap-2 ml-1 pointer-events-none">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-accent text-black font-bold text-[11px]">
            Q
          </div>
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>Project Quicksave</span>
        </div>
      </div>

      {/* ── DRAG REGION ── (Middle filler) */}
      <div data-tauri-drag-region className="flex-1 h-full cursor-default" />

      {/* Window controls */}
      <div className="flex items-stretch h-full">
        <button onClick={handleMinimize} className="flex items-center justify-center w-11 h-full hover:bg-zinc-500/10 transition-colors pointer-events-auto" style={{ color: 'var(--text-secondary)' }} title="Minimize">
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button onClick={handleMaximize} className="flex items-center justify-center w-11 h-full hover:bg-zinc-500/10 transition-colors pointer-events-auto" style={{ color: 'var(--text-secondary)' }} title="Maximize">
          <Square size={12} strokeWidth={1.5} />
        </button>
        <button onClick={handleClose} className="flex items-center justify-center w-11 h-full transition-colors hover:bg-[#e81123] hover:text-white pointer-events-auto" style={{ color: 'var(--text-secondary)' }} title="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
