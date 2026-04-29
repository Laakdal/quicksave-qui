import { Settings, FileText, Database, Package } from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const topTabs = [
    { id: "decryptor", label: "Decryptor", icon: FileText },
    { id: "save-manager", label: "Save Manager", icon: Database },
];

const bottomTabs = [
    { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, activeTab, setActiveTab }: SidebarProps) {
    return (
        <aside
            className="flex flex-col shrink-0 bg-[#18181b] overflow-hidden transition-[width] duration-300 ease-in-out"
            style={{ width: isOpen ? 200 : 48 }}
        >
            {/* ── Top section ── */}
            <div className="flex-1 py-3">
                {/* Section header — only visible when expanded */}
                {isOpen && (
                    <p className="px-4 mb-2 text-xs font-semibold text-zinc-400 select-none">
                        Tools
                    </p>
                )}
                <ul className="space-y-0.5 px-1.5 ">
                    {topTabs.map(tab => <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} isOpen={isOpen} onClick={() => setActiveTab(tab.id)} />)}
                </ul>
            </div>

            {/* ── Bottom section ── */}
            <div className="py-3">
                <ul className="space-y-0.5 px-1.5">
                    {bottomTabs.map(tab => <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} isOpen={isOpen} onClick={() => setActiveTab(tab.id)} />)}
                </ul>
            </div>
        </aside>
    );
}

/* ── NavItem ─────────────────────────────────────────────────────────── */
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
            className={`relative flex items-center gap-3 rounded-md cursor-pointer transition-colors select-none
        ${isOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
        ${active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
        >
            {/* Active left-border accent */}
            {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-white rounded-r-full" />
            )}
            <Icon size={17} strokeWidth={1.75} className={active ? "text-white" : "text-zinc-400"} />
            {isOpen && <span className="text-[14px] font-medium whitespace-nowrap">{tab.label}</span>}
        </li>
    );
}
