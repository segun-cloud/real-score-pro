import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchDetails as MatchDetailsType } from "@/types/sports";

interface DetailsTabProps {
  matchDetails: MatchDetailsType;
}

export const DetailsTab = ({ matchDetails }: DetailsTabProps) => (
  <div className="space-y-4">
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Match Events</h3>
      {matchDetails.events.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No events recorded yet</p>
      ) : (
        <div className="space-y-2">
          {matchDetails.events.map((event, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-secondary/50 rounded">
              <Badge variant="outline" className="text-xs px-2 py-1">{event.minute}'</Badge>
              <span className="text-sm flex-1">{event.description}</span>
              {event.type === 'goal' && <span className="text-lg">⚽</span>}
              {event.type === 'yellow_card' && <span className="text-lg">🟨</span>}
              {event.type === 'red_card' && <span className="text-lg">🟥</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  </div>
);
