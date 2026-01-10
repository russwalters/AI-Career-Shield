"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ArrowLeft,
  MessageCircle,
  BookOpen,
  CheckCircle,
  Circle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface MilestoneTask {
  id: string;
  title: string;
  completed: boolean;
  resource?: {
    title: string;
    url: string;
    type: string;
  };
}

interface Milestone {
  id: string;
  week: number;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  tasks: MilestoneTask[];
  successCriteria: string;
}

interface ActionPlan {
  id: string;
  targetCareer: string;
  milestones: Milestone[];
  createdAt: string;
}

export default function PlanPage() {
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>([]);

  // Fetch existing plan
  const fetchPlan = useCallback(async () => {
    try {
      const response = await fetch("/api/plan");
      if (response.ok) {
        const data = await response.json();
        if (data.plan) {
          // Process milestones to determine status
          const processedMilestones = data.plan.milestones.map(
            (m: Milestone, idx: number) => {
              const allCompleted = m.tasks.every((t) => t.completed);
              const someCompleted = m.tasks.some((t) => t.completed);
              let status: "completed" | "current" | "upcoming" = "upcoming";

              if (allCompleted) {
                status = "completed";
              } else if (idx === 0 || someCompleted) {
                status = "current";
              } else {
                // Check if previous milestone is completed
                const prevMilestone = data.plan.milestones[idx - 1];
                if (prevMilestone?.tasks.every((t: MilestoneTask) => t.completed)) {
                  status = "current";
                }
              }

              return { ...m, id: `m${idx}`, status };
            }
          );

          setPlan({
            ...data.plan,
            milestones: processedMilestones,
          });

          // Expand current milestone
          const currentIdx = processedMilestones.findIndex(
            (m: Milestone) => m.status === "current"
          );
          if (currentIdx >= 0) {
            setExpandedMilestones([`m${currentIdx}`]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch plan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate new plan
  const generatePlan = async (selectedCareer?: string) => {
    setGenerating(true);
    setError(null);

    try {
      // Get assessment and selected career from session storage
      const storedAssessment = sessionStorage.getItem("assessmentResult");
      const storedCareer = sessionStorage.getItem("selectedCareerPath");

      let assessmentId: string | null = null;
      let targetSocCode: string | null = null;

      if (storedAssessment) {
        const parsed = JSON.parse(storedAssessment);
        assessmentId = parsed.assessmentId;
      }

      // Use provided career, stored career, or let API pick best recommendation
      if (selectedCareer) {
        // Career title passed directly
      } else if (storedCareer) {
        const careerData = JSON.parse(storedCareer);
        targetSocCode = careerData.socCode;
      }
      // If no career selected, API will pick the best recommendation

      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          targetSocCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate plan");
      }

      const data = await response.json();

      // Process and set the new plan
      const processedMilestones = data.plan.milestones.map(
        (m: Milestone, idx: number) => ({
          ...m,
          id: `m${idx}`,
          status: idx === 0 ? "current" : "upcoming",
        })
      );

      setPlan({
        ...data.plan,
        milestones: processedMilestones,
      });

      setExpandedMilestones(["m0"]);
    } catch (err) {
      console.error("Failed to generate plan:", err);
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  // Toggle task completion
  const toggleTask = async (milestoneIdx: number, taskIdx: number) => {
    if (!plan) return;

    const milestone = plan.milestones[milestoneIdx];
    const task = milestone.tasks[taskIdx];
    const newCompleted = !task.completed;

    // Optimistic update
    setPlan((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.milestones = [...prev.milestones];
      updated.milestones[milestoneIdx] = {
        ...milestone,
        tasks: milestone.tasks.map((t, i) =>
          i === taskIdx ? { ...t, completed: newCompleted } : t
        ),
      };
      return updated;
    });

    // Update on server
    try {
      await fetch("/api/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          milestoneIndex: milestoneIdx,
          taskIndex: taskIdx,
          completed: newCompleted,
        }),
      });
    } catch (err) {
      console.error("Failed to update task:", err);
      // Revert on error
      setPlan((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.milestones = [...prev.milestones];
        updated.milestones[milestoneIdx] = {
          ...milestone,
          tasks: milestone.tasks.map((t, i) =>
            i === taskIdx ? { ...t, completed: !newCompleted } : t
          ),
        };
        return updated;
      });
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Calculate progress
  const completedTasks = plan
    ? plan.milestones.flatMap((m) => m.tasks.filter((t) => t.completed)).length
    : 0;
  const totalTasks = plan
    ? plan.milestones.flatMap((m) => m.tasks).length
    : 0;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get current week
  const currentMilestoneIdx = plan
    ? plan.milestones.findIndex((m) => m.status === "current")
    : 0;
  const currentWeek = plan?.milestones[currentMilestoneIdx]?.week || 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your action plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/results">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="font-bold text-lg text-slate-900">
                90-Day Action Plan
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="h-16 w-16 text-blue-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Ready to Build Your Action Plan?
              </h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Based on your assessment, we&apos;ll create a personalized 90-day
                roadmap to help you transition to a lower-risk career path.
              </p>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 max-w-md mx-auto">
                  {error}
                </div>
              )}

              <Button
                size="lg"
                onClick={() => generatePlan()}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Your Plan...
                  </>
                ) : (
                  "Generate My Action Plan"
                )}
              </Button>

              {generating && (
                <p className="text-sm text-slate-500 mt-4">
                  This may take 30-60 seconds...
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/results">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-bold text-lg text-slate-900">
                  90-Day Action Plan
                </h1>
                <p className="text-sm text-slate-500">{plan.targetCareer}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/learn">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Resources
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/coach">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Coach
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {progressPercent}% Complete
                </h2>
                <p className="text-slate-600">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 text-lg px-3 py-1"
                >
                  Week {currentWeek}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchPlan}
                  title="Refresh plan"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        {/* Milestones Timeline */}
        <div className="space-y-4">
          {plan.milestones.map((milestone, idx) => {
            const isExpanded = expandedMilestones.includes(milestone.id);
            const completedCount = milestone.tasks.filter(
              (t) => t.completed
            ).length;

            return (
              <Card
                key={milestone.id}
                className={
                  milestone.status === "current"
                    ? "border-blue-300 shadow-sm"
                    : ""
                }
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleMilestone(milestone.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          milestone.status === "completed"
                            ? "bg-green-100"
                            : milestone.status === "current"
                            ? "bg-blue-100"
                            : "bg-slate-100"
                        }`}
                      >
                        {milestone.status === "completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : milestone.status === "current" ? (
                          <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Week {milestone.week}-{milestone.week + 1}
                          </Badge>
                          {milestone.status === "current" && (
                            <Badge className="bg-blue-600 text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">
                          {milestone.title}
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {milestone.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {completedCount}/{milestone.tasks.length}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="space-y-3">
                      {milestone.tasks.map((task, taskIdx) => (
                        <div
                          key={task.id || taskIdx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(idx, taskIdx);
                            }}
                            className="mt-0.5"
                          >
                            {task.completed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p
                              className={
                                task.completed
                                  ? "text-slate-500 line-through"
                                  : "text-slate-900"
                              }
                            >
                              {task.title}
                            </p>
                            {task.resource && (
                              <a
                                href={task.resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {task.resource.title}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Success Criteria */}
                    {milestone.successCriteria && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Success criteria:</strong>{" "}
                          {milestone.successCriteria}
                        </p>
                      </div>
                    )}

                    {/* Discuss with Coach */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/coach">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Discuss this milestone with coach
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <Shield className="h-5 w-5" />
              <span className="text-sm">AI Career Shield</span>
            </div>
            <p className="text-xs text-slate-400">
              Plan updates weekly based on your progress
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
