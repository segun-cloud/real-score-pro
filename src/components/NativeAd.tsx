import { useAdMob } from "@/hooks/useAdMob";

export const NativeAd = () => {
  const { isNative } = useAdMob();

  // On native, native ads would be rendered via the AdMob plugin
  // For now show a placeholder on both web and native
  if (isNative) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-4 my-4 min-h-[100px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading ad...</span>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 my-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Sponsored</span>
        <div className="bg-secondary/50 px-2 py-1 rounded text-xs text-muted-foreground">
          AD
        </div>
      </div>
      <div className="bg-gradient-primary/10 rounded-lg p-4 text-center">
        <h3 className="font-semibold mb-2">Native Ad Placeholder</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Visible in native app build
        </p>
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg inline-block text-sm font-medium">
          Learn More
        </div>
      </div>
    </div>
  );
};
