interface MediaTabProps {}

export const MediaTab = (_: MediaTabProps) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold">Match Media</h3>
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-medium mb-2">Match Highlights</h4>
        <div className="grid grid-cols-2 gap-2">
          {["Goal Highlights", "Best Saves", "Key Moments", "Full Match"].map((label, i) => (
            <div
              key={i}
              className="bg-muted p-3 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <div className="aspect-video bg-primary/20 rounded mb-2 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">▶️ Play</span>
              </div>
              <p className="text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-medium mb-2">Match Photos</h4>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <span className="text-xs text-muted-foreground">📷</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
