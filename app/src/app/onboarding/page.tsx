"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, Loader2, Briefcase, Clock, DollarSign } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const [jobTitle, setJobTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to sign-up if not authenticated
  if (isLoaded && !isSignedIn) {
    router.push("/sign-up");
    return null;
  }

  const formatSalary = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    // Format with commas
    if (numericValue) {
      return parseInt(numericValue).toLocaleString();
    }
    return "";
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSalary(e.target.value);
    setCurrentSalary(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim() || undefined,
          yearsOfExperience: yearsOfExperience
            ? parseInt(yearsOfExperience)
            : undefined,
          currentSalary: currentSalary
            ? parseInt(currentSalary.replace(/,/g, ""))
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      // Store profile data in sessionStorage for assessment to use immediately
      sessionStorage.setItem(
        "onboardingProfile",
        JSON.stringify({
          jobTitle: jobTitle.trim() || null,
          yearsOfExperience: yearsOfExperience
            ? parseInt(yearsOfExperience)
            : null,
          currentSalary: currentSalary
            ? parseInt(currentSalary.replace(/,/g, ""))
            : null,
        })
      );

      // Redirect to assessment
      router.push("/assess");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      // Still mark onboarding as complete even if skipped
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.push("/assess");
    } catch {
      // Even if API fails, proceed to assessment
      router.push("/assess");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-slate-900">AI Career Shield</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <Badge variant="secondary" className="w-fit mx-auto mb-4">
              Quick Setup
            </Badge>
            <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
            <CardDescription className="mt-2">
              This helps us personalize your career assessment. All fields are
              optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Title */}
              <div className="space-y-2">
                <label
                  htmlFor="jobTitle"
                  className="text-sm font-medium text-slate-900 flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4 text-slate-500" />
                  Current Job Title
                </label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Marketing Manager, Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11"
                />
                <p className="text-xs text-slate-500">
                  If you provide this, we can dive deeper into your specific
                  tasks
                </p>
              </div>

              {/* Years of Experience */}
              <div className="space-y-2">
                <label
                  htmlFor="experience"
                  className="text-sm font-medium text-slate-900 flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-slate-500" />
                  Years in Current Role
                </label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g., 5"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              {/* Current Salary */}
              <div className="space-y-2">
                <label
                  htmlFor="salary"
                  className="text-sm font-medium text-slate-900 flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  Current Annual Salary (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <Input
                    id="salary"
                    type="text"
                    placeholder="85,000"
                    value={currentSalary}
                    onChange={handleSalaryChange}
                    disabled={isSubmitting}
                    className="h-11 pl-7"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Used to show relevant salary comparisons for career paths
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue to Assessment
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="h-11"
                >
                  Skip for Now
                </Button>
              </div>

              <p className="text-xs text-center text-slate-500 pt-2">
                You can always update this information later
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
