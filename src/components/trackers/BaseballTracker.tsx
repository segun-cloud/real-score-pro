import { Badge } from "@/components/ui/badge";

interface BaseballTrackerProps {
  homeTeam: string;
  awayTeam: string;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
}

export const BaseballTracker = ({ homeTeam, awayTeam, minute, homeScore, awayScore }: BaseballTrackerProps) => {
  return (
    <div className="bg-card p-4 rounded-lg">
      <div className="relative bg-green-600 rounded-lg p-4 h-64 overflow-hidden">
        {/* Baseball Diamond */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600">
          {/* Infield (diamond shape) */}
          <div className="absolute bottom-4 left-1/2 w-24 h-24 bg-amber-200 transform -translate-x-1/2 rotate-45 border-2 border-white"></div>
          
          {/* Bases */}
          <div className="absolute bottom-4 left-1/2 w-2 h-2 bg-white transform -translate-x-1/2"></div> {/* Home */}
          <div className="absolute bottom-16 right-1/3 w-2 h-2 bg-white"></div> {/* First */}
          <div className="absolute bottom-28 left-1/2 w-2 h-2 bg-white transform -translate-x-1/2"></div> {/* Second */}
          <div className="absolute bottom-16 left-1/3 w-2 h-2 bg-white"></div> {/* Third */}          
          
          {/* Pitcher's mound */}
          <div className="absolute bottom-16 left-1/2 w-3 h-3 bg-amber-300 rounded-full transform -translate-x-1/2"></div>
          
          {/* Foul lines */}
          <div className="absolute bottom-4 left-1/2 w-0.5 h-32 bg-white transform -translate-x-1/2 -rotate-45 origin-bottom"></div>
          <div className="absolute bottom-4 left-1/2 w-0.5 h-32 bg-white transform -translate-x-1/2 rotate-45 origin-bottom"></div>
          
          {/* Baseball */}
          <div className="absolute bottom-20 right-1/4 w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></div>
          
          {/* Players */}
          <div className="absolute bottom-18 left-1/2 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2"></div> {/* Pitcher */}
          <div className="absolute bottom-6 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2"></div> {/* Catcher */}
          <div className="absolute bottom-14 right-1/4 w-2 h-2 bg-red-500 rounded-full"></div> {/* First baseman */}
          <div className="absolute bottom-26 left-1/2 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2"></div> {/* Second baseman */}
        </div>
      </div>
      
      {/* Match Info */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm font-medium text-blue-600">{homeTeam}</div>
          <div className="text-2xl font-bold">{homeScore ?? 0}</div>
        </div>
        
        <div className="text-center">
          {minute && (
            <Badge variant="outline" className="mb-2">
              Inning {Math.ceil(minute / 10)}
            </Badge>
          )}
          <div className="text-xs text-muted-foreground">vs</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-red-600">{awayTeam}</div>
          <div className="text-2xl font-bold">{awayScore ?? 0}</div>
        </div>
      </div>
    </div>
  );
};