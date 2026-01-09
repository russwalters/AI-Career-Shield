"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RiskScore } from "@/components/results/RiskScore";
import { ScenarioToggle } from "@/components/results/ScenarioToggle";
import { TaskBreakdown } from "@/components/results/TaskBreakdown";
import { mockResults } from "@/data/mock-results";
import {
  Shield,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Share2,
  Download,
} from "lucide-react";

export default function ResultsPage() {
  const [activeScenario, setActiveScenario] = useState<
    "current" | "slow" | "rapid"
  >("current");

  const results = mockResults;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-7 w-7 text-blue-600" />
              <span className="font-bold text-lg text-slate-900">
                AI Career Shield
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <Badge variant="secondary" className="mb-4">
            Assessment Complete
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Your AI Career Risk Analysis
          </h1>
          <p className="text-slate-600">
            {results.occupation} • {results.industry}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Risk Score & Scenarios */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Risk Score</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RiskScore
                  score={results.riskScore}
                  confidenceRange={results.confidenceRange}
                  scenarioScores={results.scenarioScores}
                  activeScenario={activeScenario}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <ScenarioToggle
                  activeScenario={activeScenario}
                  onScenarioChange={setActiveScenario}
                  scores={{
                    current: results.riskScore,
                    slow: results.scenarioScores.slow,
                    rapid: results.scenarioScores.rapid,
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Key Insight & Task Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Insight */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Key Insight
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {results.keyInsight}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  How Your Time Breaks Down
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TaskBreakdown
                  breakdown={results.taskBreakdown}
                  tasks={results.tasks}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Skills Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Protected Skills */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Your Protected Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-600 mb-4">
                These skills are harder for AI to replicate. Lean into them.
              </p>
              <div className="flex flex-wrap gap-2">
                {results.protectedSkills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vulnerable Skills */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Vulnerable to Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-600 mb-4">
                These tasks are increasingly being handled by AI tools.
              </p>
              <div className="flex flex-wrap gap-2">
                {results.vulnerableSkills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-10" />

        {/* Career Paths Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Recommended Career Paths
              </h2>
              <p className="text-slate-600 mt-1">
                Based on your skills and lower AI exposure
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              Growth Opportunities
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {results.careerPaths.map((path) => (
              <Card
                key={path.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <CardContent className="pt-6">
                  {/* Risk Score Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge
                      variant="secondary"
                      className={
                        path.riskScore <= 40
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      Risk Score: {path.riskScore}
                    </Badge>
                    <Badge variant="outline">{path.growthOutlook} Growth</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {path.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-4">
                    {path.description}
                  </p>

                  {/* Stats */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Skills Match</span>
                      <span className="font-medium text-slate-900">
                        {path.skillsMatch}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Salary Range</span>
                      <span className="font-medium text-slate-900">
                        {path.salaryRange}
                      </span>
                    </div>
                  </div>

                  {/* Skills to Learn */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                      Skills to Learn
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {path.skillsToLearn.slice(0, 3).map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button className="w-full group-hover:bg-blue-700" asChild>
                    <Link href={`/paths?id=${path.id}`}>
                      See Action Plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Upgrade CTA */}
        <section className="mt-12 mb-8">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
            <CardContent className="py-10 px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    Ready to take action?
                  </h3>
                  <p className="text-slate-300 max-w-lg">
                    Get your personalized 90-day action plan, curated learning
                    resources, and an AI career coach that remembers your
                    journey.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
                    asChild
                  >
                    <Link href="/paths">
                      Unlock Your Action Plan
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <span className="text-slate-400 text-sm">
                    $29/month • Cancel anytime
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            This product uses O*NET® data. O*NET® is a trademark of the U.S.
            Department of Labor.
          </p>
        </div>
      </footer>
    </div>
  );
}
