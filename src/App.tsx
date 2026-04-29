import React, { useState } from "react";
import { Sidebar } from "./components/layout/sidebar";
import { Titlebar } from "./components/layout/tittlebar";
import { DecryptorView } from "./models/decryptor";
import { SettingsView } from "./models/settings";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("decryptor");

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e1e] text-zinc-100 overflow-hidden rounded-xl border border-zinc-700/50 shadow-2xl">
      
      {/* ── TITLEBAR ───────────────────────────────────────────────────── */}
      <Titlebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden bg-[#18181b]">
        <Sidebar
          isOpen={isSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Main Editor Space */}
        <main className="flex-1 overflow-hidden relative bg-[#202022] rounded-tl-[8px] shadow-[-4px_-4px_15px_rgba(0,0,0,0.1)]">
          {activeTab === "decryptor" && <DecryptorView />}
          {activeTab === "settings" && <SettingsView />}
          
          {/* Fallback for other tabs under construction */}
          {activeTab !== "decryptor" && activeTab !== "settings" && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-zinc-500">
              <h2 className="text-lg font-medium text-zinc-300 capitalize">{activeTab}</h2>
              <p className="text-sm">This module is under construction.</p>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
