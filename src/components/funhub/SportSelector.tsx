import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SPORT_CONFIG, type SportType } from "@/types/funhub";

interface SportSelectorProps {
  onSelectSport: (sport: SportType) => void;
  userTeams: { sport: SportType; division: number }[];
}

export const SportSelector = ({ onSelectSport, userTeams }: SportSelectorProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(SPORT_CONFIG).map(([sportKey, config]) => {
        const userTeam = userTeams.find(t => t.sport === sportKey);
        
        return (
          <Card 
            key={sportKey}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelectSport(sportKey as SportType)}
          >
            <CardContent className="p-6 text-center">
              <div className="text-5xl mb-3">{config.icon}</div>
              <h3 className="font-bold mb-2">{config.name}</h3>
              {userTeam ? (
                <Badge variant="secondary">Division {userTeam.division}</Badge>
              ) : (
                <Badge variant="outline">No Team</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
