"use client";

import { TaskExposure } from "@/data/mock-results";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface TaskBreakdownProps {
  breakdown: {
    highExposure: number;
    mediumExposure: number;
    lowExposure: number;
  };
  tasks: TaskExposure[];
}

function getExposureIcon(level: "high" | "medium" | "low") {
  switch (level) {
    case "high":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "medium":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "low":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
}

function getExposureColor(level: "high" | "medium" | "low") {
  switch (level) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
  }
}

function getExposureLabel(level: "high" | "medium" | "low") {
  switch (level) {
    case "high":
      return "High Exposure";
    case "medium":
      return "Medium Exposure";
    case "low":
      return "Low Exposure";
  }
}

export function TaskBreakdown({ breakdown, tasks }: TaskBreakdownProps) {
  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">
          Time Allocation by AI Exposure
        </h4>
        <div className="flex h-8 rounded-lg overflow-hidden">
          <div
            className="bg-red-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${breakdown.highExposure}%` }}
          >
            {breakdown.highExposure}%
          </div>
          <div
            className="bg-yellow-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${breakdown.mediumExposure}%` }}
          >
            {breakdown.mediumExposure}%
          </div>
          <div
            className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${breakdown.lowExposure}%` }}
          >
            {breakdown.lowExposure}%
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            High Exposure
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Low Exposure
          </span>
        </div>
      </div>

      {/* Task List */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">
          Task-Level Analysis
        </h4>
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getExposureIcon(task.exposureLevel)}
                    <h5 className="font-medium text-slate-900">{task.name}</h5>
                  </div>
                  <p className="text-sm text-slate-600">{task.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-semibold text-slate-900">
                    {task.timePercent}%
                  </div>
                  <div className="text-xs text-slate-500">of your time</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      getExposureColor(task.exposureLevel)
                    )}
                    style={{ width: `${task.timePercent}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    task.exposureLevel === "high"
                      ? "bg-red-100 text-red-700"
                      : task.exposureLevel === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  )}
                >
                  {getExposureLabel(task.exposureLevel)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
