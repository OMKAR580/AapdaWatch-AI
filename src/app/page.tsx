"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { RecentIncidents } from "@/components/dashboard/RecentIncidents";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import {
  AlertTriangle,
  Flame,
  FileSpreadsheet,
  Clock,
} from "lucide-react";

export default function OverviewPage() {
  const { incidents, reports } = useApp();

  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;
  const criticalIncidents = incidents.filter((i) => i.severity === "critical").length;
  const pendingVerification = reports.filter(
    (r) => r.verificationStatus === "unreviewed" || r.verificationStatus === "under-review"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Incidents"
          value={activeIncidents}
          subtitle="Ongoing monitored situations"
          icon={AlertTriangle}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          isDemoData={false}
        />
        <MetricCard
          title="Critical Severity"
          value={criticalIncidents}
          subtitle="Requires immediate response"
          icon={Flame}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-100 dark:bg-red-900/40"
          isDemoData={false}
        />
        <MetricCard
          title="Reports Received"
          value={reports.length}
          subtitle="Social & field messages ingested"
          icon={FileSpreadsheet}
          iconColor="text-[#326B54] dark:text-[#DCE9DA]"
          iconBg="bg-[#DCE9DA] dark:bg-[#326B54]/40"
          isDemoData={false}
        />
        <MetricCard
          title="Pending Verification"
          value={pendingVerification}
          subtitle="Awaiting human reviewer"
          icon={Clock}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
          isDemoData={false}
        />
      </div>

      {/* Charts Grid: 2/3 Activity Area Chart + 1/3 Category Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryDonut />
        </div>
      </div>

      {/* Tables Grid: 2/3 Recent Incidents + 1/3 Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentIncidents incidents={incidents} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
