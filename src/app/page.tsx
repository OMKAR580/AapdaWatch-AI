"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { RecentIncidents } from "@/components/dashboard/RecentIncidents";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ModelTelemetryCard } from "@/components/dashboard/ModelTelemetryCard";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Flame,
  FileSpreadsheet,
  Clock,
  Radio,
  Sparkles,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export default function OverviewPage() {
  const { incidents, reports } = useApp();

  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;
  const criticalIncidents = incidents.filter((i) => i.severity === "critical").length;
  const pendingVerification = reports.filter(
    (r) => r.verificationStatus === "unreviewed" || r.verificationStatus === "under-review"
  ).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Production Model Telemetry & Architecture Card */}
      <motion.div variants={itemVariants}>
        <ModelTelemetryCard />
      </motion.div>

      {/* 2. Top 4 Summary Metric Cards with Glowing Neon Accents */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          title="Active Incidents"
          value={activeIncidents}
          subtitle="Monitored situation clusters"
          icon={AlertTriangle}
          iconColor="text-amber-500 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          trend={{ value: 12, label: "this week" }}
          isDemoData={false}
        />
        <MetricCard
          title="Critical Severity"
          value={criticalIncidents}
          subtitle="Requires priority dispatch"
          icon={Flame}
          iconColor="text-rose-500 dark:text-rose-400"
          iconBg="bg-rose-500/10"
          isDemoData={false}
        />
        <MetricCard
          title="Reports Received"
          value={reports.length}
          subtitle="Social & field dispatches"
          icon={FileSpreadsheet}
          iconColor="text-emerald-500 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
          trend={{ value: 28, label: "volume trend" }}
          isDemoData={false}
        />
        <MetricCard
          title="Pending Verification"
          value={pendingVerification}
          subtitle="Human review queue"
          icon={Clock}
          iconColor="text-cyan-500 dark:text-cyan-400"
          iconBg="bg-cyan-500/10"
          isDemoData={false}
        />
      </motion.div>

      {/* 3. Charts Grid: 2/3 Activity Ingestion Area Chart + 1/3 Glowing Category Donut */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryDonut />
        </div>
      </motion.div>

      {/* 4. Incident Dossiers & Live Activity Stream */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentIncidents incidents={incidents} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </motion.div>
    </motion.div>
  );
}
