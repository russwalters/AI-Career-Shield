"use client";

import { useState } from "react";
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
} from "lucide-react";
import { mockResults } from "@/data/mock-results";

interface Milestone {
  id: string;
  week: string;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    resource?: {
      title: string;
      url: string;
      type: "video" | "course" | "article";
    };
  }[];
}

const mockMilestones: Milestone[] = [
  {
    id: "m1",
    week: "Week 1-2",
    title: "Foundation Building",
    description: "Understand the product marketing landscape and core concepts",
    status: "completed",
    tasks: [
      {
        id: "t1",
        title: "Complete Product Marketing Fundamentals course",
        completed: true,
        resource: {
          title: "Product Marketing 101 - freeCodeCamp",
          url: "https://youtube.com",
          type: "video",
        },
      },
      {
        id: "t2",
        title: "Read 5 product launch case studies",
        completed: true,
      },
      {
        id: "t3",
        title: "Set up competitive tracking spreadsheet",
        completed: true,
      },
    ],
  },
  {
    id: "m2",
    week: "Week 3-4",
    title: "Competitive Analysis Deep Dive",
    description: "Master competitive intelligence gathering and analysis",
    status: "current",
    tasks: [
      {
        id: "t4",
        title: "Complete competitive analysis framework module",
        completed: true,
        resource: {
          title: "Competitive Analysis Masterclass",
          url: "https://coursera.org",
          type: "course",
        },
      },
      {
        id: "t5",
        title: "Analyze 3 competitors in your target industry",
        completed: false,
      },
      {
        id: "t6",
        title: "Create sample battlecard",
        completed: false,
        resource: {
          title: "How to Build Battlecards - HubSpot",
          url: "https://hubspot.com",
          type: "article",
        },
      },
    ],
  },
  {
    id: "m3",
    week: "Week 5-6",
    title: "Go-to-Market Strategy",
    description: "Learn to plan and execute product launches",
    status: "upcoming",
    tasks: [
      {
        id: "t7",
        title: "Complete GTM strategy course",
        completed: false,
        resource: {
          title: "Go-to-Market Strategy - Google",
          url: "https://grow.google",
          type: "course",
        },
      },
      {
        id: "t8",
        title: "Create sample launch plan",
        completed: false,
      },
      {
        id: "t9",
        title: "Study 2 successful product launches",
        completed: false,
      },
    ],
  },
  {
    id: "m4",
    week: "Week 7-8",
    title: "Portfolio & Positioning",
    description: "Build tangible work samples and refine your story",
    status: "upcoming",
    tasks: [
      {
        id: "t10",
        title: "Create 3 portfolio pieces",
        completed: false,
      },
      {
        id: "t11",
        title: "Update LinkedIn with new positioning",
        completed: false,
      },
      {
        id: "t12",
        title: "Write transition narrative",
        completed: false,
      },
    ],
  },
  {
    id: "m5",
    week: "Week 9-10",
    title: "Network & Apply",
    description: "Connect with professionals and start applying",
    status: "upcoming",
    tasks: [
      {
        id: "t13",
        title: "Reach out to 10 product marketers",
        completed: false,
      },
      {
        id: "t14",
        title: "Apply to 5 target positions",
        completed: false,
      },
      {
        id: "t15",
        title: "Request 2 informational interviews",
        completed: false,
      },
    ],
  },
  {
    id: "m6",
    week: "Week 11-12",
    title: "Interview Prep & Refinement",
    description: "Prepare for interviews and refine your approach",
    status: "upcoming",
    tasks: [
      {
        id: "t16",
        title: "Complete interview prep module",
        completed: false,
      },
      {
        id: "t17",
        title: "Practice 3 mock interviews",
        completed: false,
      },
      {
        id: "t18",
        title: "Refine portfolio based on feedback",
        completed: false,
      },
    ],
  },
];

export default function PlanPage() {
  const [milestones, setMilestones] = useState(mockMilestones);
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>([
    "m2",
  ]);
  const selectedPath = mockResults.careerPaths[1]; // Product Marketing Manager

  const completedTasks = milestones.flatMap((m) =>
    m.tasks.filter((t) => t.completed)
  ).length;
  const totalTasks = milestones.flatMap((m) => m.tasks).length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleTask = (milestoneId: string, taskId: string) => {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              tasks: m.tasks.map((t) =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
              ),
            }
          : m
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/paths">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-bold text-lg text-slate-900">
                  90-Day Action Plan
                </h1>
                <p className="text-sm text-slate-500">{selectedPath.title}</p>
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
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 text-lg px-3 py-1"
              >
                Week 3
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </CardContent>
        </Card>

        {/* Milestones Timeline */}
        <div className="space-y-4">
          {milestones.map((milestone, idx) => {
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
                            {milestone.week}
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
                      {milestone.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(milestone.id, task.id);
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
