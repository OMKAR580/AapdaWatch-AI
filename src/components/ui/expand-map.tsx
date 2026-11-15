"use client";

import type React from "react";
import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import { X, ExternalLink, ShieldAlert, Users } from "lucide-react";

export interface LocationMapProps {
  location?: string;
  coordinates?: string;
  className?: string;
  title?: string;
  category?: string;
  severity?: string;
  reportCount?: number;
  status?: string;
  onClose?: () => void;
  onViewDossier?: () => void;
  initialExpanded?: boolean;
}

export function LocationMap({
  location = "San Francisco, CA",
  coordinates = "37.7749° N, 122.4194° W",
  className = "",
  title,
  category,
  severity,
  reportCount,
  status = "Active",
  onClose,
  onViewDossier,
  initialExpanded = true,
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-50, 50], [8, -8]);
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If clicking a button inside, don't toggle
    if ((e.target as HTMLElement).closest("button")) return;
    setIsExpanded(!isExpanded);
  };

  const severityColor =
    severity === "critical"
      ? "#ef4444"
      : severity === "high"
        ? "#f59e0b"
        : "#10b981";

  return (
    <motion.div
      ref={containerRef}
      className={`relative cursor-pointer select-none ${className}`}
      style={{
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#1A2420] border border-black/10 dark:border-white/15 shadow-2xl"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          width: isExpanded ? 360 : 250,
          height: isExpanded ? 320 : 140,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 35,
        }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 via-transparent to-black/10 dark:to-white/10" />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="absolute inset-0 bg-neutral-100 dark:bg-[#141C18]" />

              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {/* Main roads */}
                <motion.line
                  x1="0%"
                  y1="35%"
                  x2="100%"
                  y2="35%"
                  className="stroke-black/25 dark:stroke-white/25"
                  strokeWidth="4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
                <motion.line
                  x1="0%"
                  y1="65%"
                  x2="100%"
                  y2="65%"
                  className="stroke-black/25 dark:stroke-white/25"
                  strokeWidth="4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />

                {/* Vertical main roads */}
                <motion.line
                  x1="30%"
                  y1="0%"
                  x2="30%"
                  y2="100%"
                  className="stroke-black/20 dark:stroke-white/20"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                />
                <motion.line
                  x1="70%"
                  y1="0%"
                  x2="70%"
                  y2="100%"
                  className="stroke-black/20 dark:stroke-white/20"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                />

                {/* Secondary streets */}
                {[20, 50, 80].map((y, i) => (
                  <motion.line
                    key={`h-${i}`}
                    x1="0%"
                    y1={`${y}%`}
                    x2="100%"
                    y2={`${y}%`}
                    className="stroke-black/10 dark:stroke-white/10"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  />
                ))}
                {[15, 45, 55, 85].map((x, i) => (
                  <motion.line
                    key={`v-${i}`}
                    x1={`${x}%`}
                    y1="0%"
                    x2={`${x}%`}
                    y2="100%"
                    className="stroke-black/10 dark:stroke-white/10"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                  />
                ))}
              </svg>

              {/* Buildings */}
              <motion.div
                className="absolute top-[40%] left-[10%] w-[15%] h-[20%] rounded-sm bg-neutral-400/30 dark:bg-neutral-600/30 border border-neutral-400/20"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              />
              <motion.div
                className="absolute top-[15%] left-[35%] w-[12%] h-[15%] rounded-sm bg-neutral-400/25 dark:bg-neutral-600/25 border border-neutral-400/15"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              />
              <motion.div
                className="absolute top-[70%] left-[75%] w-[18%] h-[18%] rounded-sm bg-neutral-400/28 dark:bg-neutral-600/28 border border-neutral-400/18"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              />
              <motion.div
                className="absolute top-[20%] right-[10%] w-[10%] h-[25%] rounded-sm bg-neutral-400/22 dark:bg-neutral-600/22 border border-neutral-400/15"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.55 }}
              />
              <motion.div
                className="absolute top-[55%] left-[5%] w-[8%] h-[12%] rounded-sm bg-neutral-400/20 dark:bg-neutral-600/20 border border-neutral-400/12"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.65 }}
              />
              <motion.div
                className="absolute top-[8%] left-[75%] w-[14%] h-[10%] rounded-sm bg-neutral-400/22 dark:bg-neutral-600/22 border border-neutral-400/15"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.75 }}
              />

              {/* Pin Center */}
              <motion.div
                className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="drop-shadow-xl"
                  style={{ filter: `drop-shadow(0 0 12px ${severityColor}80)` }}
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    fill={severityColor}
                  />
                  <circle cx="12" cy="9" r="2.5" className="fill-white" />
                </svg>
              </motion.div>

              <div className="absolute inset-0 bg-gradient-to-t from-white/95 dark:from-[#1A2420]/95 via-transparent to-transparent opacity-80" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid pattern - only show when collapsed */}
        <motion.div
          className="absolute inset-0 opacity-[0.04]"
          animate={{ opacity: isExpanded ? 0 : 0.04 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" className="stroke-current" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </motion.div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-4 pointer-events-auto">
          {/* Top section */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <motion.div
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0"
                animate={{
                  filter: isHovered
                    ? "drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))"
                    : "drop-shadow(0 0 4px rgba(52, 211, 153, 0.3))",
                }}
                transition={{ duration: 0.3 }}
              >
                <ShieldAlert className="w-4 h-4" />
              </motion.div>

              <div className="min-w-0">
                {title && (
                  <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9] truncate">
                    {title}
                  </h4>
                )}
                {category && (
                  <span className="text-[10px] uppercase font-semibold text-[#737A70] dark:text-[#8A9490] tracking-wider">
                    {category}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Live pill & Close button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-sm"
                animate={{
                  scale: isHovered ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: severityColor }}
                />
                <span className="text-[9px] font-bold text-[#737A70] dark:text-[#8A9490] tracking-wider uppercase">
                  {severity || status}
                </span>
              </motion.div>

              {onClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-1 rounded-lg text-[#737A70] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom section */}
          <div className="space-y-1 mt-auto">
            <motion.h3
              className="text-[#242B27] dark:text-[#E8EDE9] font-bold text-sm tracking-tight truncate"
              animate={{
                x: isHovered ? 3 : 0,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {location}
            </motion.h3>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  className="space-y-2 pt-1"
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-[#737A70] dark:text-[#8A9490] text-[11px] font-mono">
                    {coordinates}
                  </p>

                  {/* Actions when expanded */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/10">
                    {reportCount !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#737A70] dark:text-[#8A9490]">
                        <Users className="w-3 h-3 text-cyan-500" />
                        <span><strong>{reportCount}</strong> reports ingested</span>
                      </span>
                    )}

                    {onViewDossier && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDossier();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#326B54] text-white text-[10px] font-bold hover:bg-[#285744] shadow-sm transition-colors ml-auto"
                      >
                        <span>View Dossier</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animated underline */}
            <motion.div
              className="h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-transparent rounded-full"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{
                scaleX: isHovered || isExpanded ? 1 : 0.35,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Click hint */}
      <motion.p
        className="absolute -bottom-5 left-1/2 text-[10px] font-medium text-[#737A70] dark:text-[#8A9490] whitespace-nowrap pointer-events-none"
        style={{ x: "-50%" }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isHovered && !isExpanded ? 1 : 0,
          y: isHovered ? 0 : 4,
        }}
        transition={{ duration: 0.2 }}
      >
        Click to expand 3D street grid
      </motion.p>
    </motion.div>
  );
}

export default LocationMap;

