import {
  Home,
  Package,
  Boxes,
  Lock,
  Grid3X3,
  FileText,
  Sun,
  Moon,
  Settings,
  Unlock,
  Save,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentTheme: string;
  onThemeToggle: () => void;
}

/* ── Navigation items matching SCSHub structure ────────────────── */

const topTabs = [
  { id: "home", label: "Home", icon: Home },
];

const toolTabs = [
  { id: "scs", label: "SCS", icon: Package },
  { id: "pix", label: "PIX", icon: Boxes },
  { id: "sxc", label: "SXC", icon: Lock },
  { id: "tobj", label: "TOBJ", icon: Grid3X3 },
  { id: "def", label: "DEF", icon: FileText },
];

const saveTabs = [
  { id: "decryptor", label: "SII Decryptor", icon: Unlock },
  { id: "save-manager", label: "Save Manager", icon: Save },
];

export function Sidebar({
  isOpen,
  activeTab,
  setActiveTab,
  currentTheme,
  onThemeToggle,
}: SidebarProps) {
  return (
    <aside
      className="flex flex-col shrink-0 overflow-visible transition-all duration-300 ease-in-out"
      style={{
        width: isOpen ? 200 : 48,
        backgroundColor: "var(--bg-sidebar)",
        color: "var(--text-primary)",
      }}
    >
      {/* ── Profile removed ── */}

      {/* Separator */}
      <div
        className="px-3"
        style={{ marginTop: "12px", marginBottom: "8px" }}
      >
        <div
          className="h-px w-full"
          style={{ backgroundColor: "var(--border-subtle)" }}
        />
      </div>

      {/* ── Home ── */}
      <div className="px-1.5">
        {topTabs.map((tab) => (
          <NavItem
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            isOpen={isOpen}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Separator */}
      <div
        className="px-3"
        style={{ marginTop: "8px", marginBottom: "8px" }}
      >
        <div
          className="h-px w-full"
          style={{ backgroundColor: "var(--border-subtle)" }}
        />
      </div>

      {/* ── SCSHub Tools section ── */}
      <div className="flex-1 pb-1">
        {isOpen && (
          <p
            className="px-4 mb-2 text-sm font-medium select-none uppercase tracking-wider transition-colors duration-300"
            style={{ color: "var(--text-primary)" }}
          >
            SCS Tools
          </p>
        )}
        <ul className="space-y-0.5 px-1.5">
          {toolTabs.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              isOpen={isOpen}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </ul>

        {/* ── Quicksave Tools section ── */}
        <div
          className="px-3"
          style={{ marginTop: "12px", marginBottom: "8px" }}
        >
          <div
            className="h-px w-full"
            style={{ backgroundColor: "var(--border-subtle)" }}
          />
        </div>

        {isOpen && (
          <p
            className="px-4 mb-2 text-sm font-medium select-none uppercase tracking-wider transition-colors duration-300"
            style={{ color: "var(--text-primary)" }}
          >
            Quicksave
          </p>
        )}
        <ul className="space-y-0.5 px-1.5">
          {saveTabs.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              isOpen={isOpen}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </ul>
      </div>

      {/* ── Bottom section ── */}
      <div className="py-3">
        <ul className="space-y-0.5 px-1.5">
          {/* Theme toggle */}
          <li
            onClick={onThemeToggle}
            title={!isOpen ? "Theme" : undefined}
            className={`relative flex items-center gap-3 rounded-md cursor-pointer transition-all duration-300 select-none
              ${isOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
              hover:bg-zinc-500/10`}
            style={{ color: "var(--text-primary)" }}
          >
            {currentTheme === "light" ? (
              <Moon size={20} strokeWidth={1.75} className="transition-colors duration-300" />
            ) : (
              <Sun size={20} strokeWidth={1.75} className="transition-colors duration-300" />
            )}
            {isOpen && (
              <span className="text-sm whitespace-nowrap">
                Theme
              </span>
            )}
          </li>

          {/* Settings */}
          <NavItem
            tab={{ id: "settings", label: "Settings", icon: Settings }}
            active={activeTab === "settings"}
            isOpen={isOpen}
            onClick={() => setActiveTab("settings")}
          />
        </ul>
      </div>
    </aside>
  );
}

/* ── NavItem ─────────────────────────────────────────────────────── */
interface NavItemProps {
  tab: { id: string; label: string; icon: React.ElementType };
  active: boolean;
  isOpen: boolean;
  onClick: () => void;
}

function NavItem({ tab, active, isOpen, onClick }: NavItemProps) {
  const Icon = tab.icon;
  return (
    <li
      onClick={onClick}
      title={!isOpen ? tab.label : undefined}
      className={`relative flex items-center gap-3 rounded-md cursor-pointer transition-all duration-300 select-none
        ${isOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
        ${active
          ? "bg-accent/10 font-medium"
          : "hover:bg-zinc-500/10"
        }`}
      style={{
        color: active
          ? "rgb(var(--accent))"
          : "var(--text-primary)",
      }}
    >
      {/* Active left-border accent */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-r-full" />
      )}
      <Icon
        size={20}
        strokeWidth={1.75}
        className="transition-colors duration-300"
      />
      {isOpen && (
        <span className="text-sm whitespace-nowrap">
          {tab.label}
        </span>
      )}
    </li>
  );
}
