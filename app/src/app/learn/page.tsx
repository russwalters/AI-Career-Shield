"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  ArrowLeft,
  MessageCircle,
  ExternalLink,
  Clock,
  CheckCircle,
  Play,
  BookOpen,
  FileText,
  Award,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  source: string;
  url: string;
  type: "video" | "course" | "article" | "certification";
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  completed: boolean;
  skill: string;
}

const mockResources: Resource[] = [
  // Competitive Analysis
  {
    id: "r1",
    title: "Competitive Analysis Fundamentals",
    source: "HubSpot Academy",
    url: "https://academy.hubspot.com",
    type: "course",
    duration: "2 hours",
    difficulty: "Beginner",
    completed: true,
    skill: "Competitive Analysis",
  },
  {
    id: "r2",
    title: "How to Build Effective Battlecards",
    source: "Product Marketing Alliance",
    url: "https://productmarketingalliance.com",
    type: "article",
    duration: "15 min read",
    difficulty: "Intermediate",
    completed: false,
    skill: "Competitive Analysis",
  },
  {
    id: "r3",
    title: "Competitive Intelligence Deep Dive",
    source: "YouTube - PMM Guide",
    url: "https://youtube.com",
    type: "video",
    duration: "45 min",
    difficulty: "Intermediate",
    completed: false,
    skill: "Competitive Analysis",
  },

  // Go-to-Market
  {
    id: "r4",
    title: "Go-to-Market Strategy Fundamentals",
    source: "Coursera - Google",
    url: "https://coursera.org",
    type: "course",
    duration: "4 hours",
    difficulty: "Beginner",
    completed: false,
    skill: "Go-to-Market",
  },
  {
    id: "r5",
    title: "Product Launch Playbook",
    source: "First Round Review",
    url: "https://firstround.com",
    type: "article",
    duration: "20 min read",
    difficulty: "Intermediate",
    completed: false,
    skill: "Go-to-Market",
  },
  {
    id: "r6",
    title: "GTM Strategy Workshop",
    source: "YouTube - Lenny's Podcast",
    url: "https://youtube.com",
    type: "video",
    duration: "1.5 hours",
    difficulty: "Advanced",
    completed: false,
    skill: "Go-to-Market",
  },

  // Product Management
  {
    id: "r7",
    title: "Product Management Basics",
    source: "freeCodeCamp",
    url: "https://freecodecamp.org",
    type: "video",
    duration: "3 hours",
    difficulty: "Beginner",
    completed: true,
    skill: "Product Management",
  },
  {
    id: "r8",
    title: "Google Project Management Certificate",
    source: "Coursera - Google",
    url: "https://coursera.org",
    type: "certification",
    duration: "6 months",
    difficulty: "Intermediate",
    completed: false,
    skill: "Product Management",
  },

  // Communication
  {
    id: "r9",
    title: "Executive Presentation Skills",
    source: "LinkedIn Learning",
    url: "https://linkedin.com/learning",
    type: "course",
    duration: "1.5 hours",
    difficulty: "Intermediate",
    completed: false,
    skill: "Communication",
  },
  {
    id: "r10",
    title: "Storytelling for Business",
    source: "YouTube - TED",
    url: "https://youtube.com",
    type: "video",
    duration: "30 min",
    difficulty: "Beginner",
    completed: true,
    skill: "Communication",
  },
];

const skills = [
  "All",
  "Competitive Analysis",
  "Go-to-Market",
  "Product Management",
  "Communication",
];

function getTypeIcon(type: Resource["type"]) {
  switch (type) {
    case "video":
      return <Play className="h-4 w-4" />;
    case "course":
      return <BookOpen className="h-4 w-4" />;
    case "article":
      return <FileText className="h-4 w-4" />;
    case "certification":
      return <Award className="h-4 w-4" />;
  }
}

function getTypeBadgeColor(type: Resource["type"]) {
  switch (type) {
    case "video":
      return "bg-red-100 text-red-700";
    case "course":
      return "bg-blue-100 text-blue-700";
    case "article":
      return "bg-green-100 text-green-700";
    case "certification":
      return "bg-purple-100 text-purple-700";
  }
}

export default function LearnPage() {
  const [resources, setResources] = useState(mockResources);
  const [activeSkill, setActiveSkill] = useState("All");

  const completedCount = resources.filter((r) => r.completed).length;
  const progressPercent = Math.round((completedCount / resources.length) * 100);

  const filteredResources =
    activeSkill === "All"
      ? resources
      : resources.filter((r) => r.skill === activeSkill);

  const toggleComplete = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  // Get recommended next resource (first incomplete)
  const recommendedNext = resources.find((r) => !r.completed);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/plan">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-bold text-lg text-slate-900">
                  Learning Agenda
                </h1>
                <p className="text-sm text-slate-500">
                  Curated free resources for your transition
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/coach">
                <MessageCircle className="h-4 w-4 mr-2" />
                Ask Coach
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Learning Progress
                </h2>
                <p className="text-slate-600">
                  {completedCount} of {resources.length} resources completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {progressPercent}%
                </div>
                <p className="text-sm text-slate-500">complete</p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Recommended Next */}
        {recommendedNext && (
          <Card className="mb-8 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-blue-600">Up Next</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {recommendedNext.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                    <span>{recommendedNext.source}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recommendedNext.duration}
                    </span>
                  </div>
                </div>
                <Button asChild>
                  <a
                    href={recommendedNext.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Start
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skill Tabs */}
        <Tabs defaultValue="All" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6">
            {skills.map((skill) => (
              <TabsTrigger
                key={skill}
                value={skill}
                onClick={() => setActiveSkill(skill)}
                className="flex-shrink-0"
              >
                {skill}
                {skill !== "All" && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {resources.filter((r) => r.skill === skill).length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeSkill} className="mt-0">
            <div className="space-y-4">
              {filteredResources.map((resource) => (
                <Card
                  key={resource.id}
                  className={
                    resource.completed ? "opacity-75" : "hover:shadow-sm"
                  }
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleComplete(resource.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {resource.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-slate-300 hover:border-slate-400" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3
                              className={`font-medium ${
                                resource.completed
                                  ? "text-slate-500 line-through"
                                  : "text-slate-900"
                              }`}
                            >
                              {resource.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              {resource.source}
                            </p>
                          </div>

                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-3">
                          <Badge
                            variant="secondary"
                            className={getTypeBadgeColor(resource.type)}
                          >
                            {getTypeIcon(resource.type)}
                            <span className="ml-1 capitalize">
                              {resource.type}
                            </span>
                          </Badge>
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {resource.duration}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {resource.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No resources in this category
            </h3>
            <p className="text-slate-600">
              Check back later or explore other skill areas.
            </p>
          </div>
        )}
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
              All resources are free to access
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
