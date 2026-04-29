import React, { useState } from "react";
import { Settings, Palette, Database, Info } from "lucide-react";

const SETTINGS_TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data & Storage", icon: Database },
  { id: "about", label: "About", icon: Info },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="flex w-full h-full text-zinc-200">
      
      {/* ── Inner Sidebar ── */}
      <div className="w-56 flex flex-col bg-[#18181b]/50 border-r border-zinc-800/60 p-3 shrink-0">
        <h2 className="px-3 mb-2 text-[12px] font-semibold text-zinc-400 select-none">
          Settings
        </h2>
        <div className="flex flex-col gap-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-1.5 text-[14px] font-medium rounded-md transition-colors w-full text-left ${
                  isActive 
                    ? "bg-zinc-700/60 text-zinc-200" 
                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                <Icon size={18} className={isActive ? "text-zinc-300" : "text-zinc-500"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "general" && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold text-white mb-6">General Settings</h1>
            
            {/* Mock Setting Item 1 */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800/60">
              <div>
                <p className="font-medium text-zinc-200 text-sm">Auto-Save Decrypted Files</p>
                <p className="text-xs text-zinc-500 mt-0.5">Automatically download the .sii file after decryption.</p>
              </div>
              {/* Mock Toggle Switch */}
              <div className="w-10 h-5 bg-[#24c8db] rounded-full flex items-center justify-end px-1 cursor-pointer transition-colors shadow-inner">
                <div className="w-3.5 h-3.5 bg-black rounded-full shadow-sm" />
              </div>
            </div>
            
            {/* Mock Setting Item 2 */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800/60">
              <div>
                <p className="font-medium text-zinc-200 text-sm">Default Game Directory</p>
                <p className="text-xs text-zinc-500 mt-0.5">Path to your Euro Truck Simulator 2 save folder.</p>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors border border-zinc-700/50">
                Browse...
              </button>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold text-white mb-6">Appearance</h1>
            <p className="text-sm text-zinc-400">Theme customization options will go here.</p>
          </div>
        )}

        {activeTab === "data" && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold text-white mb-6">Data & Storage</h1>
            <p className="text-sm text-zinc-400">Manage your cached save files here.</p>
          </div>
        )}

        {activeTab === "about" && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-semibold text-white mb-6">About Project Quicksave</h1>
            <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#24c8db]/10 text-[#24c8db] font-bold text-xl">
                Q
              </div>
              <div>
                <p className="font-medium text-zinc-200">Version 0.1.0 (Alpha)</p>
                <p className="text-sm text-zinc-500">Powered by Tauri v2 + React 19 Engine</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
