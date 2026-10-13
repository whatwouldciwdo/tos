"use client";

import { FileText, Clock, CheckCircle, FileEdit } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    total: number;
    pending: number;
    drafts: number;
    completed: number;
  };
  className?: string;
}

export default function DashboardStats({ stats, className = "" }: DashboardStatsProps) {
  const statCards = [
    {
      label: "Total TORs",
      value: stats.total,
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
    {
      label: "Pending Approval",
      value: stats.pending,
      icon: Clock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
    },
    {
      label: "Drafts",
      value: stats.drafts,
      icon: FileEdit,
      color: "text-gray-400",
      bg: "bg-gray-500/10",
      border: "border-gray-500/30",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-[#42ff6b]",
      bg: "bg-[#42ff6b]/10",
      border: "border-[#42ff6b]/30",
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 ${className}`}>
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="p-5 neu-card-sm cursor-default"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {card.label}
                </p>
                <p className={`text-3xl font-bold mt-2 ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl neu-inset-sm flex items-center justify-center">
                <Icon size={22} className={card.color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
