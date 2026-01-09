"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UpgradeModal } from "@/components/layout/UpgradeModal";
import { mockResults } from "@/data/mock-results";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Clock,
  BookOpen,
  Target,
  Briefcase,
} from "lucide-react";

export default function PathsPage() {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPath, setSelectedPath] = useState(mockResults.careerPaths[0]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleViewActionPlan = () => {
    if (isSubscribed) {
      router.push("/plan");
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleUpgrade = () => {
    // In production, this would integrate with Stripe
    setIsSubscribed(true);
    router.push("/plan");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/results">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-7 w-7 text-blue-600" />
                <span className="font-bold text-lg text-slate-900">
                  Career Paths
                </span>
              </div>
            </div>
            {!isSubscribed && (
              <Button onClick={() => setShowUpgradeModal(true)}>
                Upgrade to Shield
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Role Context */}
        <div className="mb-8">
          <p className="text-slate-600 mb-1">Your current role:</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {mockResults.occupation} • Risk Score: {mockResults.riskScore}
          </h1>
        </div>

        {/* Path Selection Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {mockResults.careerPaths.map((path) => (
            <button
              key={path.id}
              onClick={() => setSelectedPath(path)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedPath.id === path.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {path.title}
            </button>
          ))}
        </div>

        {/* Selected Path Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {selectedPath.title}
                    </CardTitle>
                    <p className="text-slate-600 mt-1">
                      {selectedPath.description}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      selectedPath.riskScore <= 40
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    Risk: {selectedPath.riskScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Target className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedPath.skillsMatch}%
                    </div>
                    <div className="text-xs text-slate-500">Skills Match</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-slate-900">
                      {selectedPath.growthOutlook}
                    </div>
                    <div className="text-xs text-slate-500">Job Growth</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Briefcase className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-slate-900">
                      {selectedPath.salaryRange.split(" - ")[0]}+
                    </div>
                    <div className="text-xs text-slate-500">Salary Range</div>
                  </div>
                </div>

                {/* Skills You Have */}
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Skills You Already Have
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPath.currentSkillsApplicable.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-green-100 text-green-700"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Skills to Learn */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Skills to Develop
                  </h4>
                  <div className="space-y-3">
                    {selectedPath.skillsToLearn.map((skill, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 rounded-lg p-3"
                      >
                        <span className="text-slate-700">{skill}</span>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-4 w-4" />
                          <span>~4-6 weeks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Plan Preview (Blurred for free users) */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  90-Day Action Plan
                  {!isSubscribed && (
                    <Badge variant="outline" className="ml-2">
                      Shield Required
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent
                className={!isSubscribed ? "filter blur-sm select-none" : ""}
              >
                <div className="space-y-4">
                  {[
                    {
                      week: "Week 1-2",
                      task: "Research and enroll in foundational course",
                    },
                    {
                      week: "Week 3-4",
                      task: "Complete first certification module",
                    },
                    { week: "Week 5-6", task: "Start portfolio project" },
                    { week: "Week 7-8", task: "Network with professionals" },
                    { week: "Week 9-10", task: "Apply to entry positions" },
                    { week: "Week 11-12", task: "Interview prep and refinement" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-20 flex-shrink-0 text-sm font-medium text-slate-500">
                        {item.week}
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-lg p-3">
                        <span className="text-slate-700">{item.task}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Upgrade Overlay */}
              {!isSubscribed && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      Unlock Your Action Plan
                    </h3>
                    <p className="text-slate-600 mb-4 max-w-sm">
                      Get a personalized week-by-week roadmap with curated
                      resources and AI coaching.
                    </p>
                    <Button onClick={() => setShowUpgradeModal(true)}>
                      Upgrade to Shield — $29/mo
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Transition Readiness */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transition Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Skills Match</span>
                      <span className="font-medium">
                        {selectedPath.skillsMatch}%
                      </span>
                    </div>
                    <Progress value={selectedPath.skillsMatch} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Risk Reduction</span>
                      <span className="font-medium text-green-600">
                        -{mockResults.riskScore - selectedPath.riskScore} pts
                      </span>
                    </div>
                    <Progress
                      value={
                        ((mockResults.riskScore - selectedPath.riskScore) /
                          mockResults.riskScore) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-2">Ready to start?</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Get your personalized action plan and start making progress
                  today.
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleViewActionPlan}
                >
                  {isSubscribed ? "View Action Plan" : "Unlock Action Plan"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
