"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: () => void;
}

export function UpgradeModal({
  open,
  onOpenChange,
  onUpgrade,
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Unlock Your Action Plan</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            You&apos;ve discovered your risk profile. Now get the roadmap to take
            action.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Price */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-slate-900">
              $29
              <span className="text-lg font-normal text-slate-500">/month</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              or $249/year (save 29%)
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {[
              "Personalized 90-day action plan with milestones",
              "AI career coach that remembers your journey",
              "Curated free learning resources",
              "Weekly check-ins and plan adjustments",
              "Unlimited coaching conversations",
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              onUpgrade?.();
              onOpenChange(false);
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Shield — $29/month
          </Button>

          <p className="text-center text-xs text-slate-500 mt-3">
            Cancel anytime. No questions asked.
          </p>
        </div>

        {/* Maybe Later */}
        <button
          onClick={() => onOpenChange(false)}
          className="text-sm text-slate-500 hover:text-slate-700 text-center w-full"
        >
          Maybe later
        </button>
      </DialogContent>
    </Dialog>
  );
}
