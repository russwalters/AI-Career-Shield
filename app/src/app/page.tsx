import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import {
  Shield,
  Target,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  Zap,
  Brain,
  Map,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-slate-900">
                AI Career Shield
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="#pricing"
                className="text-slate-600 hover:text-slate-900 hidden sm:block"
              >
                Pricing
              </Link>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost">Sign In</Button>
                </SignInButton>
                <Button asChild>
                  <Link href="/assess">Get Started</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild variant="outline">
                  <Link href="/assess">Dashboard</Link>
                </Button>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            Free AI Risk Assessment
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6">
            Know your risk.
            <br />
            <span className="text-blue-600">Own your future.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            AI is changing work. Find out where you stand—and what to do about
            it. Get a personalized assessment of your career&apos;s AI exposure
            and a concrete action plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/assess">
                Get Your Free Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              asChild
            >
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            No credit card required. Takes 5 minutes.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">80%</div>
              <div className="text-slate-300">
                of workers have tasks exposed to AI automation
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">12M</div>
              <div className="text-slate-300">
                Americans will need to change occupations by 2030
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">52%</div>
              <div className="text-slate-300">
                of workers worry about AI&apos;s workplace impact
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get clarity on your career in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="relative overflow-hidden border-2 hover:border-blue-200 transition-colors">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="absolute top-4 right-4 text-6xl font-bold text-slate-100">
                  1
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Tell Us About Your Work
                  </h3>
                  <p className="text-slate-600">
                    Have a conversation with our AI about what you actually do
                    day-to-day. Not a form—a real dialogue.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-blue-200 transition-colors">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="absolute top-4 right-4 text-6xl font-bold text-slate-100">
                  2
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Get Your Risk Score
                  </h3>
                  <p className="text-slate-600">
                    See exactly which parts of your job are vulnerable to AI,
                    and which are your competitive advantage.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-blue-200 transition-colors">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="absolute top-4 right-4 text-6xl font-bold text-slate-100">
                  3
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Map className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    See Your Path Forward
                  </h3>
                  <p className="text-slate-600">
                    Discover 2-3 career paths that leverage your skills while
                    reducing AI exposure. Know your next move.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              What You Get
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              More than a risk calculator. A complete career strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Task-Level Analysis",
                description:
                  "See which specific tasks in your job face high AI exposure vs. your protected skills.",
              },
              {
                icon: TrendingUp,
                title: "Career Path Recommendations",
                description:
                  "Get 2-3 realistic career paths based on your skills, with growth projections.",
              },
              {
                icon: Zap,
                title: "Skills Gap Identification",
                description:
                  "Know exactly what skills you need to develop for each recommended path.",
              },
              {
                icon: Target,
                title: "Personalized Risk Score",
                description:
                  "A 0-100 vulnerability score with confidence intervals and scenario modeling.",
              },
              {
                icon: MessageCircle,
                title: "AI Career Coach",
                description:
                  "Ongoing coaching that remembers your situation and adapts over time. (Shield)",
              },
              {
                icon: Map,
                title: "90-Day Action Plan",
                description:
                  "Concrete milestones, learning resources, and weekly check-ins. (Shield)",
              },
            ].map((feature, index) => (
              <Card key={index} className="border hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-4 px-6">
                  <feature.icon className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Start free. Upgrade when you&apos;re ready for the full roadmap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <Card className="border-2 hover:border-slate-300 transition-colors">
              <CardContent className="pt-8 pb-8 px-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Free
                  </h3>
                  <div className="text-4xl font-bold text-slate-900">
                    $0
                    <span className="text-lg font-normal text-slate-500">
                      /forever
                    </span>
                  </div>
                </div>
                <p className="text-slate-600 mb-6">
                  Get the diagnosis. Understand your situation.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Full AI vulnerability assessment",
                    "Task-level risk breakdown",
                    "Personalized risk score",
                    "2-3 recommended career paths",
                    "Skills gap identification",
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <Link href="/assess">Start Free Assessment</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Shield Tier */}
            <Card className="border-2 border-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
              <CardContent className="pt-8 pb-8 px-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Shield
                  </h3>
                  <div className="text-4xl font-bold text-slate-900">
                    $29
                    <span className="text-lg font-normal text-slate-500">
                      /month
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    or $249/year (save 29%)
                  </p>
                </div>
                <p className="text-slate-600 mb-6">
                  Get the prescription. Execute your plan.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Everything in Free",
                    "90-day personalized action plan",
                    "Curated free learning resources",
                    "AI career coach with memory",
                    "Weekly check-ins & plan adjustments",
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/assess">Start Free, Upgrade Anytime</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            The landscape is shifting.
            <br />
            <span className="text-blue-400">Know where you stand.</span>
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Take 5 minutes to understand your career&apos;s AI exposure. It&apos;s
            free, and you might be surprised by what you learn.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700"
            asChild
          >
            <Link href="/assess">
              Get Your Free Assessment
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-400" />
              <span className="font-semibold text-white">AI Career Shield</span>
            </div>
            <p className="text-slate-400 text-sm text-center">
              This product uses O*NET® data. O*NET® is a trademark of the U.S.
              Department of Labor.
            </p>
            <div className="flex gap-6 text-slate-400 text-sm">
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
