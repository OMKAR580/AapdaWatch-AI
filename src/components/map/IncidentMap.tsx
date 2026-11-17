"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DottedMap from "dotted-map";
import Image from "next/image";
import { useTheme } from "next-themes";
import type { Incident, Severity } from "@/types";
import { LOCATION_DETAILS } from "@/services/analysis.service";
import {
  MapPin,
  Flame,
  AlertTriangle,
  Radio,
  Globe,
  Zap,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";

interface IncidentMapProps {
  incidents: Incident[];
  onIncidentClick: (incident: Incident) => void;
  selectedIncidentId?: string | null;
  lineColor?: string;
}

export function IncidentMap({
  incidents,
  onIncidentClick,
  selectedIncidentId,
  lineColor = "#0ea5e9",
}: IncidentMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [hoveredIncident, setHoveredIncident] = useState<Incident | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"india" | "global">("india");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const { theme: rawTheme } = useTheme();
  const theme = rawTheme || "light";

  const handleSwitchViewMode = (mode: "india" | "global") => {
    setViewMode(mode);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3.0));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.75);
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Dotted India map (Dedicated country bounds: exact state outlines across India)
  const indiaMap = useMemo(
    () => new DottedMap({ height: 100, countries: ["IND"], grid: "diagonal" }),
    []
  );

  // Dotted world map for Global Grid
  const worldMap = useMemo(
    () => new DottedMap({ height: 100, grid: "diagonal" }),
    []
  );

  const activeSvgMap = useMemo(() => {
    if (viewMode === "india") {
      return indiaMap.getSVG({
        radius: 0.28,
        color: theme === "dark" ? "#FFFF7F45" : "#00000035",
        shape: "circle",
        backgroundColor: theme === "dark" ? "black" : "white",
      });
    } else {
      return worldMap.getSVG({
        radius: 0.22,
        color: theme === "dark" ? "#FFFF7F40" : "#00000040",
        shape: "circle",
        backgroundColor: theme === "dark" ? "black" : "white",
      });
    }
  }, [viewMode, indiaMap, worldMap, theme]);

  // Exact projection: Pin mapping on India map, Equirectangular on World
  const projectPoint = useCallback(
    (lat: number, lng: number) => {
      if (viewMode === "india") {
        try {
          const pin = indiaMap.getPin({ lat, lng });
          if (pin && typeof pin.x === "number" && typeof pin.y === "number") {
            return {
              x: (pin.x / 98) * 800,
              y: (pin.y / 100) * 816,
            };
          }
        } catch {
          // fallback
        }
        return { x: 400, y: 400 };
      } else {
        const x = (lng + 180) * (800 / 360);
        const y = (90 - lat) * (400 / 180);
        return { x, y };
      }
    },
    [viewMode, indiaMap]
  );

  // Exact curved bezier path from WorldMap
  const createCurvedPath = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      // Proportional upward arc matching WorldMap
      const arcHeight = Math.max(22, Math.min(65, dist * 0.35));
      return `M ${start.x} ${start.y} Q ${midX} ${midY - arcHeight} ${end.x} ${end.y}`;
    },
    []
  );

  // Real disaster connection lines (correlates live dispatches across cities and intercontinental hubs)
  const connectionLines = useMemo(() => {
    const list: Array<{
      id: string;
      start: { lat: number; lng: number; label: string };
      end: { lat: number; lng: number; label: string };
      color: string;
    }> = [];

    // 1. Inter-incident correlations (incidents sharing the same disaster category)
    const categoryGroups: Record<string, Incident[]> = {};
    incidents.forEach((inc) => {
      if (inc.location?.latitude && inc.location?.longitude) {
        const cat = inc.category || "disaster";
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push(inc);
      }
    });

    Object.entries(categoryGroups).forEach(([cat, items]) => {
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          const a = items[i];
          const b = items[i + 1];
          if (a.location && b.location && a.id !== b.id) {
            list.push({
              id: `line-${a.id}-${b.id}`,
              start: {
                lat: a.location.latitude,
                lng: a.location.longitude,
                label: a.location.name?.split(",")[0] || a.title,
              },
              end: {
                lat: b.location.latitude,
                lng: b.location.longitude,
                label: b.location.name?.split(",")[0] || b.title,
              },
              color:
                cat === "flood"
                  ? "#0ea5e9"
                  : cat === "cyclone"
                    ? "#8b5cf6"
                    : cat === "earthquake"
                      ? "#f59e0b"
                      : "#ef4444",
            });
          }
        }
      }
    });

    // 2. Intra-incident multi-location correlations (e.g. New York <-> New Delhi within single report/incident)
    incidents.forEach((inc) => {
      const startLoc = inc.location;
      if (!startLoc?.latitude || !startLoc?.longitude) return;

      const extraLocs: Array<{ lat: number; lng: number; label: string }> = [];

      // Check explicit secondaryLocations
      if (inc.secondaryLocations && inc.secondaryLocations.length > 0) {
        inc.secondaryLocations.forEach((sec) => {
          extraLocs.push({
            lat: sec.latitude,
            lng: sec.longitude,
            label: sec.name.split(",")[0].trim(),
          });
        });
      }

      // Check text mentions in description or title
      const textToSearch = `${inc.title} ${inc.description || ""}`.toLowerCase();
      for (const [key, details] of Object.entries(LOCATION_DETAILS)) {
        const isMatched =
          new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(textToSearch) ||
          textToSearch.includes(key);

        if (isMatched) {
          const label = details.name.split(",")[0].trim();
          const isSelf =
            Math.abs(details.lat - startLoc.latitude) < 0.1 &&
            Math.abs(details.lng - startLoc.longitude) < 0.1;
          if (!isSelf && !extraLocs.some((e) => e.label === label)) {
            extraLocs.push({
              lat: details.lat,
              lng: details.lng,
              label,
            });
          }
        }
      }

      extraLocs.forEach((extra) => {
        const lineId = `intra-${inc.id}-${extra.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        if (!list.some((l) => l.id === lineId)) {
          list.push({
            id: lineId,
            start: {
              lat: extra.lat,
              lng: extra.lng,
              label: extra.label,
            },
            end: {
              lat: startLoc.latitude,
              lng: startLoc.longitude,
              label: startLoc.name.split(",")[0].trim(),
            },
            color:
              inc.category === "flood"
                ? "#0ea5e9"
                : inc.category === "cyclone"
                  ? "#8b5cf6"
                  : inc.category === "earthquake"
                    ? "#f59e0b"
                    : "#ef4444",
          });
        }
      });
    });

    return list;
  }, [incidents]);

  // Unique connected nodes (e.g. New York, New Delhi, Mathura, Kanpur) with zero overlap
  const connectedNodes = useMemo(() => {
    const nodeMap = new Map<
      string,
      { label: string; lat: number; lng: number; xOffset?: number; yOffset?: number }
    >();

    connectionLines.forEach((line) => {
      if (!nodeMap.has(line.start.label)) {
        nodeMap.set(line.start.label, {
          label: line.start.label,
          lat: line.start.lat,
          lng: line.start.lng,
          xOffset:
            line.start.label === "Mathura" ? -56 :
            line.start.label === "New York" ? -60 :
            line.start.label === "Los Angeles" ? -72 : 10,
          yOffset:
            line.start.label === "Mathura" ? -32 :
            line.start.label === "New York" ? -28 :
            line.start.label === "Los Angeles" ? -28 : -16,
        });
      }
      if (!nodeMap.has(line.end.label)) {
        nodeMap.set(line.end.label, {
          label: line.end.label,
          lat: line.end.lat,
          lng: line.end.lng,
          xOffset:
            line.end.label === "Kanpur" ? 10 :
            line.end.label === "New Delhi" ? 12 : -56,
          yOffset:
            line.end.label === "Kanpur" ? -16 :
            line.end.label === "New Delhi" ? -20 : -32,
        });
      }
    });

    return Array.from(nodeMap.values());
  }, [connectionLines]);

  // Auto-switch to "global" Grid when intercontinental points or connections exist
  useEffect(() => {
    const hasGlobal =
      incidents.some(
        (i) =>
          i.location &&
          (i.location.longitude < 65 ||
            i.location.longitude > 100 ||
            i.location.latitude < 5 ||
            i.location.latitude > 38)
      ) ||
      connectionLines.some(
        (l) =>
          l.start.lng < 65 ||
          l.start.lng > 100 ||
          l.end.lng < 65 ||
          l.end.lng > 100
      );

    if (hasGlobal) {
      setViewMode("global");
    }
  }, [incidents, connectionLines]);

  // Animation timing configuration matching WorldMap video
  const staggerDelay = 0.35;
  const animationDuration = 2;
  const totalAnimationTime = Math.max(1, connectionLines.length) * staggerDelay + animationDuration;
  const pauseTime = 2; // Pause for 2 seconds when all paths are drawn
  const fullCycleDuration = totalAnimationTime + pauseTime;

  // Map each incident (and secondary location hubs) to an exact point on the map
  const incidentPoints = useMemo(() => {
    const points: Array<{
      incident: Incident;
      x: number;
      y: number;
    }> = [];
    const seen = new Set<string>();

    incidents.forEach((inc) => {
      if (inc.location?.latitude && inc.location?.longitude) {
        const pt = projectPoint(inc.location.latitude, inc.location.longitude);
        const key = `${inc.id}-${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        if (!seen.has(key)) {
          seen.add(key);
          points.push({ incident: inc, x: pt.x, y: pt.y });
        }
      }

      if (inc.secondaryLocations && inc.secondaryLocations.length > 0) {
        inc.secondaryLocations.forEach((sec, idx) => {
          const pt = projectPoint(sec.latitude, sec.longitude);
          const key = `${inc.id}-sec-${idx}-${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          if (!seen.has(key)) {
            seen.add(key);
            points.push({
              incident: {
                ...inc,
                id: `${inc.id}-sec-${idx}`,
                title: `${inc.category ? inc.category.toUpperCase() : "DISASTER"} — ${sec.name}`,
                location: {
                  name: sec.name,
                  latitude: sec.latitude,
                  longitude: sec.longitude,
                  state: sec.state,
                },
              },
              x: pt.x,
              y: pt.y,
            });
          }
        });
      }
    });

    return points;
  }, [incidents, projectPoint]);

  return (
    <div className="w-full aspect-[1.3/1] md:aspect-[1.6/1] lg:aspect-[1.8/1] dark:bg-black bg-white rounded-2xl relative font-sans overflow-hidden border border-black/10 dark:border-white/10 shadow-xl select-none">
      {/* Map Content Layer with Smooth Fade and Interactive Zoom/Pan */}
      <motion.div
        key={`view-container-${viewMode}`}
        drag={zoomLevel > 1}
        dragConstraints={{
          left: -400 * (zoomLevel - 1),
          right: 400 * (zoomLevel - 1),
          top: -350 * (zoomLevel - 1),
          bottom: 350 * (zoomLevel - 1),
        }}
        dragElastic={0.08}
        initial={{ opacity: 0.8 }}
        animate={{
          opacity: 1,
          scale: zoomLevel,
          x: panOffset.x,
          y: panOffset.y,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`w-full h-full relative ${zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        {/* 1. Dotted Map SVG Background */}
        <Image
          src={`data:image/svg+xml;utf8,${encodeURIComponent(activeSvgMap)}`}
          className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,white_5%,white_95%,transparent)] pointer-events-none select-none object-contain p-2 opacity-90 dark:opacity-85"
          alt="AapdaWatch Geospatial Dotted Map"
          height={viewMode === "india" ? 816 : 400}
          width={800}
          draggable={false}
          priority
        />

        {/* 2. Vector SVG Overlay */}
        <svg
          ref={svgRef}
          viewBox={viewMode === "india" ? "0 0 800 816" : "0 0 800 400"}
          className="w-full h-full absolute inset-0 pointer-events-auto select-none p-2"
          preserveAspectRatio="xMidYMid meet"
        >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <filter id="glow">
            <feMorphology operator="dilate" radius="0.5" />
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 3. Simple Animated Curved Paths for Real Disasters Connecting Places */}
        {connectionLines.map((line, i) => {
          const startPoint = projectPoint(line.start.lat, line.start.lng);
          const endPoint = projectPoint(line.end.lat, line.end.lng);
          const curvedPath = createCurvedPath(startPoint, endPoint);

          const startTime = (i * staggerDelay) / fullCycleDuration;
          const endTime = (i * staggerDelay + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;
          const dotColor = line.color || lineColor;

          return (
            <g key={`path-group-${line.id}-${viewMode}`}>
              {/* Animated Progressive Path */}
              <motion.path
                d={curvedPath}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: [0, 0, 1, 1, 0],
                }}
                transition={{
                  duration: fullCycleDuration,
                  times: [0, startTime, endTime, resetTime, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0,
                }}
              />

              {/* Leading Traveling Glowing Particle */}
              <motion.circle
                r="3.5"
                fill={dotColor}
                filter="url(#glow)"
                initial={{ offsetDistance: "0%", opacity: 0 }}
                animate={{
                  offsetDistance: [null, "0%", "100%", "100%", "100%"],
                  opacity: [0, 0, 1, 0, 0],
                }}
                transition={{
                  duration: fullCycleDuration,
                  times: [0, startTime, endTime, resetTime, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0,
                }}
                style={{
                  offsetPath: `path('${curvedPath}')`,
                }}
              />
            </g>
          );
        })}

        {/* 4. Connected Real Disaster Nodes with Clean Floating Cards */}
        {connectedNodes.map((node, i) => {
          const pt = projectPoint(node.lat, node.lng);

          return (
            <g key={`connected-node-${node.label}-${viewMode}`}>
              {/* Outer pulsing ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill={lineColor}
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  from="3"
                  to="12"
                  dur="2s"
                  begin={`${(i % 5) * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="2s"
                  begin={`${(i % 5) * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>

              {/* Glowing center dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill={lineColor}
                filter="url(#glow)"
                className="drop-shadow-lg"
              />

              {/* Clean White Card Label */}
              <motion.g
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * i + 0.1, duration: 0.4 }}
                className="pointer-events-none select-none"
              >
                <foreignObject
                  x={pt.x + (node.xOffset ?? -50)}
                  y={pt.y + (node.yOffset ?? -35)}
                  width="100"
                  height="30"
                  className="block pointer-events-none select-none"
                >
                  <div className="flex items-center justify-center h-full pointer-events-none select-none">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-white/95 dark:bg-[#101520]/95 text-black dark:text-white border border-gray-200 dark:border-gray-800 shadow-sm whitespace-nowrap pointer-events-none select-none">
                      {node.label}
                    </span>
                  </div>
                </foreignObject>
              </motion.g>
            </g>
          );
        })}

        {/* 5. Interactive Incident Markers on Exact Coordinates */}
        {incidentPoints.map(({ incident, x, y }) => {
          const isSelected = incident.id === selectedIncidentId;
          const isHovered = hoveredIncident?.id === incident.id;
          const isCritical = incident.severity === "critical";
          const markerColor =
            incident.severity === "critical"
              ? "#ef4444"
              : incident.severity === "high"
                ? "#f59e0b"
                : "#10b981";

          const heightBase = viewMode === "india" ? 816 : 400;

          return (
            <g key={`incident-marker-${incident.id}`}>
              {/* Highlight Halo for Selected or Hovered Incident (Pointer Events None) */}
              {(isSelected || isHovered) && (
                <circle
                  cx={x}
                  cy={y}
                  r="10"
                  fill="none"
                  stroke={markerColor}
                  strokeWidth="2"
                  className="pointer-events-none transition-all duration-200 animate-pulse"
                  opacity={0.8}
                />
              )}

              {/* Pulsing Outer Wave for Critical Incidents (Pointer Events None to prevent hover flickering) */}
              {isCritical && (
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={markerColor}
                  opacity="0.6"
                  className="pointer-events-none"
                >
                  <animate
                    attributeName="r"
                    from="4"
                    to="14"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.7"
                    to="0"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Marker Visual Core (Pointer Events None) */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4.5}
                fill={markerColor}
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="url(#glow)"
                className="drop-shadow-md pointer-events-none transition-all duration-150"
              />

              {/* Dedicated Stable Hit Target (Invisible 16px Circle - Never shifts size, eliminating hover blinking) */}
              <circle
                cx={x}
                cy={y}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onIncidentClick(incident)}
                onMouseEnter={() => {
                  setHoveredIncident(incident);
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: (x / 800) * rect.width,
                      y: (y / heightBase) * rect.height,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredIncident(null);
                  setTooltipPos(null);
                }}
              />
            </g>
          );
        })}
      </svg>
      </motion.div>

      {/* Empty State Banner when no predictions exist */}
      {incidents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-4 rounded-2xl bg-white/85 dark:bg-black/85 backdrop-blur-md border border-black/10 dark:border-white/10 text-center shadow-xl max-w-sm pointer-events-auto">
            <Radio className="w-5 h-5 text-[#326B54] mx-auto mb-1.5 animate-pulse" />
            <h4 className="text-xs font-bold text-[#242B27] dark:text-[#E8EDE9]">
              Live Map Ready for Predictions
            </h4>
            <p className="text-[11px] text-[#737A70] dark:text-[#8A9490] mt-1 leading-relaxed">
              No live incidents yet. Enter any disaster report in{" "}
              <strong className="text-[#326B54] dark:text-emerald-400">Analyze Information</strong> to dynamically classify and plot incidents in real-time.
            </p>
          </div>
        </div>
      )}

      {/* 6. Top Left View Switcher (India Theater vs Global Grid) */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <div className="flex items-center bg-white/90 dark:bg-black/85 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl p-1 shadow-md">
          <button
            onClick={() => handleSwitchViewMode("india")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "india"
                ? "bg-[#326B54] text-white shadow-sm"
                : "text-[#737A70] hover:text-black dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>India Theater</span>
          </button>

          <button
            onClick={() => handleSwitchViewMode("global")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "global"
                ? "bg-[#326B54] text-white shadow-sm"
                : "text-[#737A70] hover:text-black dark:hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Global Grid</span>
          </button>
        </div>
      </div>


      {/* 7. Bottom-Right Interactive Zoom Controls (+ / - / Reset) */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col items-center bg-white/95 dark:bg-[#1A2420]/95 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl shadow-lg p-1 gap-1 select-none">
        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3.0}
          title="Zoom In (+)"
          className="p-1.5 rounded-lg text-[#242B27] dark:text-[#E8EDE9] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Percentage Badge */}
        <span className="text-[10px] font-mono font-bold text-[#737A70] dark:text-[#8A9490] px-1">
          {Math.round(zoomLevel * 100)}%
        </span>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 0.75}
          title="Zoom Out (-)"
          className="p-1.5 rounded-lg text-[#242B27] dark:text-[#E8EDE9] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Reset View Button */}
        {zoomLevel !== 1 && (
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset to 100%"
            className="p-1.5 mt-0.5 rounded-lg text-[#326B54] dark:text-[#6ee7b7] hover:bg-emerald-500/10 active:scale-95 transition-all border-t border-black/5 dark:border-white/5"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 8. Interactive Hovered Incident Tooltip */}
      <AnimatePresence>
        {hoveredIncident && tooltipPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-none select-none z-40 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md border border-black/10 dark:border-white/15 rounded-xl shadow-2xl p-3 text-xs w-[220px] text-[#242B27] dark:text-[#E8EDE9]"
            style={{
              left: Math.max(12, Math.min(tooltipPos.x + 14, (svgRef.current?.clientWidth || 800) - 230)),
              top: Math.max(12, tooltipPos.y - 10),
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold text-[#326B54] dark:text-[#DCE9DA]">
                {hoveredIncident.incidentCode}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                  hoveredIncident.severity === "critical"
                    ? "bg-red-100 text-red-700"
                    : hoveredIncident.severity === "high"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {hoveredIncident.severity}
              </span>
            </div>

            <div className="font-bold text-xs leading-snug line-clamp-2">
              {hoveredIncident.title}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-[#737A70] mt-1">
              <MapPin className="w-3 h-3 text-[#326B54]" />
              <span className="truncate">{hoveredIncident.location.name}</span>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[10px] text-[#737A70]">
              <span>Reports:</span>
              <span className="font-bold text-[#242B27] dark:text-[#E8EDE9]">
                {hoveredIncident.reportCount} signals
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
