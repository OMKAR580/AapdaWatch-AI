"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export type GlassSettings = {
  blur: number;
  opacity: number;
  saturation: number;
  tint: string;
  edge: number;
};

export const DEFAULT_GLASS_SETTINGS: GlassSettings = {
  blur: 22,
  opacity: 0.3,
  saturation: 1.2,
  tint: "#ffffff",
  edge: 0.6,
};

export const GLASS_PRESETS: Record<string, GlassSettings> = {
  Default: DEFAULT_GLASS_SETTINGS,
  Crisp: { blur: 12, opacity: 0.18, saturation: 1.05, tint: "#ffffff", edge: 0.8 },
  Frosted: { blur: 28, opacity: 0.42, saturation: 1.25, tint: "#f2ebd9", edge: 0.55 },
  Amber: { blur: 24, opacity: 0.32, saturation: 1.35, tint: "#eadbc7", edge: 0.7 },
  Deep: { blur: 30, opacity: 0.5, saturation: 1.4, tint: "#1c1814", edge: 0.4 },
};

export const DEFAULT_ROOM_BACKGROUND =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2400&q=80";

interface GlassContextType {
  settings: GlassSettings;
  updateSettings: (newSettings: Partial<GlassSettings>) => void;
  applyPreset: (name: string) => void;
  resetSettings: () => void;
  isAdjustOpen: boolean;
  setIsAdjustOpen: (open: boolean) => void;
  toggleAdjust: () => void;
  backgroundImage: string;
  setBackgroundImage: (url: string) => void;
}

const GlassContext = createContext<GlassContextType | undefined>(undefined);

export function GlassProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GlassSettings>(DEFAULT_GLASS_SETTINGS);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(DEFAULT_ROOM_BACKGROUND);

  // Safely hydrate glass settings from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("aapdawatch_glass_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setSettings((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const applyToCSS = useCallback((s: GlassSettings) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--gw-blur", `${s.blur}px`);
    root.style.setProperty("--gw-opacity", `${s.opacity}`);
    root.style.setProperty("--gw-saturation", `${s.saturation}`);
    root.style.setProperty("--gw-tint", s.tint);
    root.style.setProperty("--gw-edge", `${s.edge}`);
  }, []);

  useEffect(() => {
    applyToCSS(settings);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("aapdawatch_glass_settings", JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
  }, [settings, applyToCSS]);

  const updateSettings = useCallback((newSettings: Partial<GlassSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const applyPreset = useCallback((name: string) => {
    if (GLASS_PRESETS[name]) {
      setSettings(GLASS_PRESETS[name]);
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_GLASS_SETTINGS);
  }, []);

  const toggleAdjust = useCallback(() => {
    setIsAdjustOpen((prev) => !prev);
  }, []);

  return (
    <GlassContext.Provider
      value={{
        settings,
        updateSettings,
        applyPreset,
        resetSettings,
        isAdjustOpen,
        setIsAdjustOpen,
        toggleAdjust,
        backgroundImage,
        setBackgroundImage,
      }}
    >
      {children}
    </GlassContext.Provider>
  );
}

export function useGlass() {
  const context = useContext(GlassContext);
  if (!context) {
    throw new Error("useGlass must be used within a GlassProvider");
  }
  return context;
}

