"use client";

import { cn } from "@/lib/utils";

interface ScenarioToggleProps {
  activeScenario: "current" | "slow" | "rapid";
  onScenarioChange: (scenario: "current" | "slow" | "rapid") => void;
  scores: {
    current: number;
    slow: number;
    rapid: number;
  };
}

export function ScenarioToggle({
  activeScenario,
  onScenarioChange,
  scores,
}: ScenarioToggleProps) {
  const scenarios: {
    id: "current" | "slow" | "rapid";
    label: string;
    description: string;
  }[] = [
    {
      id: "slow",
      label: "Slow AI Progress",
      description: "If AI advances cautiously",
    },
    {
      id: "current",
      label: "Current Trajectory",
      description: "Based on present trends",
    },
    {
      id: "rapid",
      label: "Rapid AI Progress",
      description: "If AI accelerates faster",
    },
  ];

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <h4 className="text-sm font-medium text-slate-700 mb-3">
        AI Advancement Scenario
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onScenarioChange(scenario.id)}
            className={cn(
              "relative p-3 rounded-lg border-2 transition-all text-left",
              activeScenario === scenario.id
                ? "border-blue-500 bg-white shadow-sm"
                : "border-transparent bg-white/50 hover:bg-white hover:border-slate-200"
            )}
          >
            <div className="text-xs font-medium text-slate-900 mb-1">
              {scenario.label}
            </div>
            <div className="text-lg font-bold text-slate-900">
              {scores[scenario.id]}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {scenario.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
