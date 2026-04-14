import { useAdMob } from "@/hooks/useAdMob";
import { useEffect } from "react";

interface BannerAdProps {
  position?: "top" | "bottom";
}

export const BannerAd = ({ position = "bottom" }: BannerAdProps) => {
  const { isNative, isInitialized, showBanner, hideBanner } = useAdMob();

  useEffect(() => {
    if (isNative && isInitialized) {
      showBanner(position);
      return () => { hideBanner(); };
    }
  }, [isNative, isInitialized, position, showBanner, hideBanner]);

  // Native ads are rendered by the plugin overlay — no DOM needed
  if (isNative) return null;

  // Web fallback placeholder
  return (
    <div className="bg-muted/50 border-t border-border/30 p-2 text-center">
      <div className="bg-secondary/30 rounded-lg py-2 px-4 text-xs text-muted-foreground/70">
        Banner Ad (AdMob — visible in native app)
      </div>
    </div>
  );
};
