import { Settings, Unlock, Save } from "lucide-react";
import { ProfileBar } from "./profile";

interface SidebarProps {
    isOpen: boolean;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const topTabs = [
    { id: "decryptor", label: "Decryptor", icon: Unlock },
    { id: "save-manager", label: "Save Manager", icon: Save },
];

const bottomTabs = [
    { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, activeTab, setActiveTab }: SidebarProps) {
    return (
        <aside
            className="flex flex-col shrink-0 overflow-visible transition-all duration-300 ease-in-out"
            style={{
                width: isOpen ? 200 : 48,
                backgroundColor: 'var(--bg-sidebar)',
                color: 'var(--text-primary)'
            }}
        >
            {/* ── Profile ── */}
            <ProfileBar isOpen={isOpen} />

            {/* Separator Line */}
            <div className="px-3" style={{ marginTop: '12px', marginBottom: '12px' }}>
                <div className="h-[1px] w-full" style={{ backgroundColor: 'var(--border-subtle)' }} />
            </div>

            {/* ── Top section ── */}
            <div className="flex-1 pb-3">
                {/* Section header — only visible when expanded */}
                {isOpen && (
                    <p
                        className="px-4 mb-2 text-[14px] font-semibold select-none transition-colors duration-300"
                        style={{ color: 'var(--text-sidebar-secondary)' }}
                    >
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
            className={`relative flex items-center gap-3 rounded-md cursor-pointer transition-all duration-300 select-none
        ${isOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
        ${active
                    ? "bg-[#24c8db]/10 font-medium"
                    : "hover:bg-zinc-500/10"
                }`}
            style={{
                color: active ? 'var(--accent)' : 'var(--text-sidebar-secondary)'
            }}
        >
            {/* Active left-border accent */}
            {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#24c8db] rounded-r-full" />
            )}
            <Icon size={20} strokeWidth={1.75} className="transition-colors duration-300" />
            {isOpen && <span className="text-[14px] font-medium whitespace-nowrap">{tab.label}</span>}
        </li>
    );
}
