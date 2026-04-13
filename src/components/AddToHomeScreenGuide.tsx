import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, MoreVertical, Plus, ArrowDown, Smartphone } from "lucide-react";

type Platform = "ios" | "android" | "other";

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
};

const isStandalone = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
};

interface AddToHomeScreenGuideProps {
  onDismiss: () => void;
}

export const AddToHomeScreenGuide = ({ onDismiss }: AddToHomeScreenGuideProps) => {
  const [platform] = useState<Platform>(detectPlatform);
  const [step, setStep] = useState(0);

  const iosSteps = [
    {
      icon: <Share className="h-10 w-10 text-primary" />,
      title: "Tap the Share button",
      description: "In Safari, tap the Share icon at the bottom of the screen (square with an arrow pointing up).",
    },
    {
      icon: <ArrowDown className="h-10 w-10 text-primary" />,
      title: "Scroll down",
      description: 'Scroll down in the share menu to find "Add to Home Screen".',
    },
    {
      icon: <Plus className="h-10 w-10 text-primary" />,
      title: 'Tap "Add to Home Screen"',
      description: 'Tap "Add" in the top right corner to confirm. The RealScore icon will appear on your home screen!',
    },
  ];

  const androidSteps = [
    {
      icon: <MoreVertical className="h-10 w-10 text-primary" />,
      title: "Tap the menu button",
      description: 'In Chrome, tap the three-dot menu (⋮) in the top-right corner of the browser.',
    },
    {
      icon: <Smartphone className="h-10 w-10 text-primary" />,
      title: '"Add to Home screen"',
      description: 'Tap "Add to Home screen" or "Install app" from the menu.',
    },
    {
      icon: <Plus className="h-10 w-10 text-primary" />,
      title: "Confirm installation",
      description: 'Tap "Add" to confirm. The RealScore icon will appear on your home screen!',
    },
  ];

  const steps = platform === "ios" ? iosSteps : androidSteps;
  const totalSteps = steps.length;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onDismiss();
    }
  };

  if (platform === "other") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="RealScore" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-foreground">RealScore</span>
        </div>
        <button
          onClick={onDismiss}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {step === 0 && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Get the full experience
            </h1>
            <p className="text-muted-foreground">
              Add RealScore to your home screen for instant access — just like a real app!
            </p>
          </div>
        )}

        <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center mb-6">
          {steps[step].icon}
        </div>

        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Step {step + 1} of {totalSteps}
            {platform === "ios" ? " · Safari" : " · Chrome"}
          </span>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-3">
          {steps[step].title}
        </h2>

        <p className="text-muted-foreground max-w-xs leading-relaxed">
          {steps[step].description}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step
                ? "w-8 bg-primary"
                : i < step
                ? "w-2 bg-primary/40"
                : "w-2 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 space-y-3">
        <Button onClick={handleNext} className="w-full" size="lg">
          {step < totalSteps - 1 ? "Next" : "Got it!"}
        </Button>
        {step === 0 && (
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="w-full text-muted-foreground"
            size="lg"
          >
            Maybe later
          </Button>
        )}
      </div>
    </div>
  );
};
