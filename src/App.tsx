import { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/sidebar";
import { Titlebar } from "./components/layout/tittlebar";
import { DecryptorView } from "./models/decryptor";
import { SettingsView } from "./models/settings";
import { SaveManagerView } from "./models/savemanager";
import { HomeView } from "./components/views/HomeView";
import { ScsView } from "./components/views/ScsView";
import { PixView } from "./components/views/PixView";
import { SxcView } from "./components/views/SxcView";
import { TobjView } from "./components/views/TobjView";
import { DefView } from "./components/views/DefView";

export default function App() {
  // Initialize state from localStorage if available, default to true
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_open");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [activeTab, setActiveTab] = useState("home");
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "dark";
  });

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar_open", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    // Initial check
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load custom accent color on mount
  useEffect(() => {
    const customAccent = localStorage.getItem('theme_accent_color');
    if (customAccent) {
      document.documentElement.style.setProperty('--accent', customAccent);
    }
  }, []);

  // Theme toggle cycles: dark → light → hybrid → blue → dark
  const handleThemeToggle = () => {
    const themes = ["dark", "light"];
    const idx = themes.indexOf(theme);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next);
  };

  const themeClass = theme === "light" ? "theme-light" : "";

  return (
    <div
      className={`flex flex-col h-screen w-full overflow-hidden rounded-xl border shadow-2xl ${themeClass}`}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-subtle)'
      }}
    >

      {/* ── TITLEBAR ───────────────────────────────────────────────────── */}
      <Titlebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
        <Sidebar
          isOpen={isSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentTheme={theme}
          onThemeToggle={handleThemeToggle}
        />

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-hidden relative rounded-tl-[8px] shadow-[-4px_-4px_15px_rgba(0,0,0,0.1)] transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          {/* ── SCSHub Views ── */}
          {activeTab === "home" && (
            <HomeView onNavigate={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === "scs" && <ScsView />}
          {activeTab === "pix" && <PixView />}
          {activeTab === "sxc" && <SxcView />}
          {activeTab === "tobj" && <TobjView />}
          {activeTab === "def" && <DefView />}

          {/* ── Quicksave Views ── */}
          {activeTab === "decryptor" && <DecryptorView />}
          {activeTab === "save-manager" && (
            <SaveManagerView
              onNavigate={() => { setSettingsInitialTab("data"); setActiveTab("settings"); }}
            />
          )}
          {activeTab === "settings" && (
            <SettingsView
              currentTheme={theme}
              onThemeChange={setTheme}
              initialTab={settingsInitialTab}
              onTabViewed={() => setSettingsInitialTab(undefined)}
            />
          )}
        </main>
      </div>

    </div>
  );
}
