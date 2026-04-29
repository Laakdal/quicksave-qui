import { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/sidebar";
import { Titlebar } from "./components/layout/tittlebar";
import { DecryptorView } from "./models/decryptor";
import { SettingsView } from "./models/settings";
import { SaveManagerView } from "./models/savemanager";

export default function App() {
  // Initialize state from localStorage if available, default to true
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar_open");
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [activeTab, setActiveTab] = useState("decryptor");
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

  const themeClass = theme === "light" ? "theme-light" : theme === "hybrid" ? "theme-hybrid" : "";

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
        />

        {/* Main Editor Space */}
        <main 
          className="flex-1 overflow-hidden relative rounded-tl-[8px] shadow-[-4px_-4px_15px_rgba(0,0,0,0.1)] transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
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
          
          {/* Fallback for other tabs under construction */}
          {activeTab !== "decryptor" && activeTab !== "save-manager" && activeTab !== "settings" && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2 opacity-50">
              <h2 className="text-lg font-medium capitalize">{activeTab}</h2>
              <p className="text-sm">This module is under construction.</p>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
