"use client";

import { cn } from "@/lib/utils";

interface RiskScoreProps {
  score: number;
  confidenceRange: [number, number];
  scenarioScores?: {
    slow: number;
    rapid: number;
  };
  activeScenario?: "current" | "slow" | "rapid";
}

function getScoreColor(score: number) {
  if (score <= 30) return "text-green-500";
  if (score <= 60) return "text-yellow-500";
  return "text-red-500";
}

function getScoreLabel(score: number) {
  if (score <= 30) return "Low Exposure";
  if (score <= 60) return "Moderate Exposure";
  return "High Exposure";
}

function getScoreBgColor(score: number) {
  if (score <= 30) return "bg-green-500";
  if (score <= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function RiskScore({
  score,
  confidenceRange,
  scenarioScores,
  activeScenario = "current",
}: RiskScoreProps) {
  const displayScore =
    activeScenario === "slow"
      ? scenarioScores?.slow ?? score
      : activeScenario === "rapid"
      ? scenarioScores?.rapid ?? score
      : score;

  return (
    <div className="text-center">
      {/* Main Score */}
      <div className="relative inline-flex items-center justify-center">
        {/* Circular background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "w-40 h-40 rounded-full opacity-10",
              getScoreBgColor(displayScore)
            )}
          />
        </div>

        {/* Score display */}
        <div className="relative z-10 w-44 h-44 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-6xl font-bold tabular-nums",
              getScoreColor(displayScore)
            )}
          >
            {displayScore}
          </span>
          <span className="text-slate-500 text-sm mt-1">out of 100</span>
        </div>
      </div>

      {/* Label */}
      <div className="mt-4">
        <span
          className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
            displayScore <= 30
              ? "bg-green-100 text-green-700"
              : displayScore <= 60
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {getScoreLabel(displayScore)}
        </span>
      </div>

      {/* Confidence Range */}
      <p className="text-slate-500 text-sm mt-3">
        Confidence range:{" "}
        <span className="font-medium text-slate-700">
          {confidenceRange[0]} - {confidenceRange[1]}
        </span>
      </p>
    </div>
  );
}
