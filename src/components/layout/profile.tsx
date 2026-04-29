import { useState, useRef, useEffect } from "react";
import { X, ChevronRight, UserCircle, Camera } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

/* ── Types ──────────────────────────────────────────────────────── */

interface ProfileData {
  id: string;      // Folder name (hex)
  displayName: string; // Decrypted name
  avatarUrl: string;
}

interface ProfileBarProps {
  isOpen: boolean;
}

/* ── ProfileBar ─────────────────────────────────────────────────── */

export function ProfileBar({ isOpen }: ProfileBarProps) {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem("active_save_profile") || "");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Load game profiles
  const refreshGameProfiles = async () => {
    try {
      const path = localStorage.getItem("game_profiles_path");
      if (path) {
        const gameProfiles = await invoke<any[]>("get_game_profiles", { path });
        const mapped = gameProfiles.map(p => ({
          id: p.id,
          displayName: p.name,
          avatarUrl: "" 
        }));
        setProfiles(mapped);
        
        // Sync active ID if not set
        if (!activeId && mapped.length > 0) {
          const firstId = mapped[0].id;
          setActiveId(firstId);
          localStorage.setItem("active_save_profile", firstId);
        }
      }
    } catch (err) {
      console.error("Sidebar profile scan failed:", err);
    }
  };

  useEffect(() => {
    refreshGameProfiles();

    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        barRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !barRef.current.contains(e.target as Node)
      ) {
        setIsPopupOpen(false);
        setShowProfileSelector(false);
      }
    }

    if (isPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    const handleStorage = () => {
      const newActive = localStorage.getItem("active_save_profile");
      if (newActive) setActiveId(newActive);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("profile-changed", handleStorage);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("profile-changed", handleStorage);
    };
  }, [isPopupOpen]);

  const activeProfile = profiles.find(p => p.id === activeId) || { id: activeId, displayName: "User", avatarUrl: "" };

  const switchProfile = (id: string) => {
    setActiveId(id);
    localStorage.setItem("active_save_profile", id);
    window.dispatchEvent(new Event("profile-changed"));
    setShowProfileSelector(false);
  };

  return (
    <>
      <div className="relative px-1.5 pt-3 pb-0">
        {/* ── Profile Bar (clickable) ── */}
        <div
          ref={barRef}
          onClick={() => { setIsPopupOpen(!isPopupOpen); setShowProfileSelector(false); }}
          className={`flex items-center gap-3 rounded-md cursor-pointer transition-all duration-200 select-none
            ${isOpen ? "px-3 py-2" : "px-0 py-2 justify-center"}
            hover:bg-zinc-500/10`}
          title={!isOpen ? activeProfile.displayName : undefined}
        >
          {/* Avatar Placeholder */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-zinc-700 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: 'var(--text-sidebar-primary)' }}>
              {activeProfile.displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Name — only when expanded */}
          {isOpen && (
            <span
              className="text-[14px] font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300 flex-1"
              style={{ color: 'var(--text-sidebar-primary)' }}
            >
              {activeProfile.displayName}
            </span>
          )}
          
          {isOpen && (
            <ChevronRight 
              size={14} 
              className={`transition-transform duration-200 ${isPopupOpen ? 'rotate-90' : ''}`}
              style={{ color: 'var(--text-secondary)' }} 
            />
          )}
        </div>

        {/* ── Profile Popup ── */}
        {isPopupOpen && (
          <div
            ref={popupRef}
            className="absolute z-50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              left: '6px',
              right: '6px',
              top: '100%',
              marginTop: '4px',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-subtle)',
              width: isOpen ? undefined : '188px',
            }}
          >
            {/* ── Active Profile Info ── */}
            <div className="p-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                   {activeProfile.displayName.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-sm truncate w-full text-center" style={{ color: 'var(--text-primary)' }}>
                    {activeProfile.displayName}
                </p>
                <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {activeProfile.id}
                </p>
            </div>

            {/* ── Divider ── */}
            <div className="mx-3" style={{ borderBottom: '1px solid var(--border-subtle)' }} />

            {/* ── Switch Profiles ── */}
            <div className="p-2">
              <button
                onClick={() => setShowProfileSelector(!showProfileSelector)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${showProfileSelector ? 'bg-[#24c8db]/10 text-[#24c8db]' : 'hover:bg-zinc-500/10 text-primary'}`}
                style={{ color: showProfileSelector ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                <UserCircle size={16} style={{ color: showProfileSelector ? 'var(--accent)' : 'var(--text-secondary)' }} />
                <span className="flex-1 text-left">Switch Profiles</span>
                <ChevronRight size={14} className={`transition-transform ${showProfileSelector ? 'rotate-90' : ''}`} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* ── Profile Selector List ── */}
            {showProfileSelector && (
              <div className="px-2 pb-2 space-y-1 max-h-[200px] overflow-y-auto">
                 {profiles.map(p => (
                   <button
                     key={p.id}
                     onClick={() => switchProfile(p.id)}
                     className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${p.id === activeId ? 'bg-[#24c8db]/10 text-[#24c8db]' : 'hover:bg-zinc-500/10 text-primary'}`}
                     style={{ color: p.id === activeId ? 'var(--accent)' : 'var(--text-primary)' }}
                   >
                     <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px]">
                        {p.displayName.charAt(0).toUpperCase()}
                     </div>
                     <span className="truncate flex-1 text-left">{p.displayName}</span>
                     {p.id === activeId && <div className="w-1.5 h-1.5 rounded-full bg-[#24c8db]" />}
                   </button>
                 ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
