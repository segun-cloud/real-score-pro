export const NativeAd = () => {
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
          AdMob ID: ca-app-pub-5502720572669424/2079028457
        </p>
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg inline-block text-sm font-medium">
          Learn More
        </div>
      </div>
    </div>
  );
};