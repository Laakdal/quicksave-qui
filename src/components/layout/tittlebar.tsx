import { getCurrentWindow } from "@tauri-apps/api/window";
import { Menu, Minus, Square, X } from "lucide-react";

interface TitlebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
}

const appWindow = getCurrentWindow();

async function minimize() { await appWindow.minimize(); }
async function maximize() { await appWindow.toggleMaximize(); }
async function closeWin() { await appWindow.close(); }

export function Titlebar({ isSidebarOpen, setIsSidebarOpen }: TitlebarProps) {
  return (
    <header className="relative flex items-center h-10 bg-[#18181b] shrink-0 z-50">
      {/* Drag region: sits behind everything, fills the bar */}
      <div data-tauri-drag-region className="absolute inset-0" />

      {/* Left controls – rendered above the drag region */}
      <div className="relative flex items-center gap-2 pl-3 pr-4 z-10 pointer-events-auto">
        <button
          onClick={() => setIsSidebarOpen((o: boolean) => !o)}
          className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>

        {/* App icon + name */}
        <div className="flex items-center gap-2 ml-1 select-none pointer-events-none">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-[#24c8db] text-black font-bold text-[11px]">
            Q
          </div>
          <span className="text-[13px] font-medium text-zinc-200">Project Quicksave</span>
        </div>
      </div>

      {/* Window controls – flush right, above drag region */}
      <div className="relative ml-auto flex items-stretch h-full z-10 pointer-events-auto">
        <button onClick={minimize} className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-white/10 hover:text-white" title="Minimize">
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button onClick={maximize} className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-white/10 hover:text-white" title="Maximize">
          <Square size={12} strokeWidth={1.5} />
        </button>
        <button onClick={closeWin} className="flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-[#e81123] hover:text-white" title="Close">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
