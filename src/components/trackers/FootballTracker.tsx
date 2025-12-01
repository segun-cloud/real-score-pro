import { Badge } from "@/components/ui/badge";

interface FootballTrackerProps {
  homeTeam: string;
  awayTeam: string;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  isSimulating?: boolean;
  ballPosition?: { x: number; y: number };
  currentEvent?: { type: string; team: 'home' | 'away' };
}

export const FootballTracker = ({ homeTeam, awayTeam, minute, homeScore, awayScore, isSimulating, ballPosition, currentEvent }: FootballTrackerProps) => {
  return (
    <div className="bg-card p-4 rounded-lg">
      <div className="relative bg-green-600 rounded-lg p-4 h-64 overflow-hidden">
        {/* Football Field */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500 to-green-700">
          {/* Field lines */}
          <div className="absolute inset-0">
            {/* Center line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/80"></div>
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white/80 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            {/* Goal areas */}
            <div className="absolute left-0 top-1/2 w-8 h-20 border-2 border-white/80 border-l-0 transform -translate-y-1/2"></div>
            <div className="absolute right-0 top-1/2 w-8 h-20 border-2 border-white/80 border-r-0 transform -translate-y-1/2"></div>
            {/* Penalty areas */}
            <div className="absolute left-0 top-1/2 w-16 h-32 border-2 border-white/80 border-l-0 transform -translate-y-1/2"></div>
            <div className="absolute right-0 top-1/2 w-16 h-32 border-2 border-white/80 border-r-0 transform -translate-y-1/2"></div>
          </div>
          
          {/* Ball */}
          <div 
            className="absolute w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-300"
            style={{
              left: isSimulating && ballPosition ? `${ballPosition.x}%` : '50%',
              top: isSimulating && ballPosition ? `${ballPosition.y}%` : '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
          
          {/* Goal Animation */}
          {currentEvent?.type === 'goal' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-fade-in">
              <div className="text-5xl font-bold text-white animate-bounce">
                ⚽ GOAL!
              </div>
            </div>
          )}
          
          {/* Players (simplified dots) */}
          <div className="absolute top-8 left-12 w-2 h-2 bg-blue-400 rounded-full"></div>
          <div className="absolute top-16 left-20 w-2 h-2 bg-blue-400 rounded-full"></div>
          <div className="absolute top-24 left-8 w-2 h-2 bg-blue-400 rounded-full"></div>
          <div className="absolute top-8 right-12 w-2 h-2 bg-red-400 rounded-full"></div>
          <div className="absolute top-16 right-20 w-2 h-2 bg-red-400 rounded-full"></div>
          <div className="absolute top-24 right-8 w-2 h-2 bg-red-400 rounded-full"></div>
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
              {minute}'
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