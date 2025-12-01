import { Badge } from "@/components/ui/badge";

interface TennisTrackerProps {
  homeTeam: string;
  awayTeam: string;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  isSimulating?: boolean;
  ballPosition?: { x: number; y: number };
  currentEvent?: { type: string; team: 'home' | 'away' };
}

export const TennisTracker = ({ homeTeam, awayTeam, minute, homeScore, awayScore, isSimulating, ballPosition, currentEvent }: TennisTrackerProps) => {
  return (
    <div className="bg-card p-4 rounded-lg">
      <div className="relative bg-green-400 rounded-lg p-4 h-64 overflow-hidden">
        {/* Tennis Court */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-300 to-green-500">
          {/* Court lines */}
          <div className="absolute inset-0 border-2 border-white">
            {/* Net */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white transform -translate-x-1/2"></div>
            {/* Service lines */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-white"></div>
            <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-white"></div>
            {/* Center service line */}
            <div className="absolute top-8 bottom-8 left-1/2 w-0.5 bg-white transform -translate-x-1/2"></div>
            {/* Doubles alleys */}
            <div className="absolute top-0 bottom-0 left-8 w-0.5 bg-white"></div>
            <div className="absolute top-0 bottom-0 right-8 w-0.5 bg-white"></div>
          </div>
          
          {/* Tennis ball */}
          <div 
            className="absolute w-2 h-2 bg-yellow-300 rounded-full shadow-lg transition-all duration-300"
            style={{
              left: isSimulating && ballPosition ? `${ballPosition.x}%` : '66%',
              top: isSimulating && ballPosition ? `${ballPosition.y}%` : '25%',
              transform: 'translate(-50%, -50%)'
            }}
          />
          
          {/* Point Animation */}
          {currentEvent?.type === 'point' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-fade-in">
              <div className="text-5xl font-bold text-white animate-bounce">
                🎾 SET!
              </div>
            </div>
          )}
          
          {/* Players */}
          <div className="absolute bottom-12 left-1/3 w-3 h-3 bg-blue-500 rounded-full"></div>
          <div className="absolute top-12 right-1/3 w-3 h-3 bg-red-500 rounded-full"></div>
          
          {/* Rackets (simplified) */}
          <div className="absolute bottom-10 left-1/3 w-1 h-4 bg-brown-600 transform rotate-45"></div>
          <div className="absolute top-10 right-1/3 w-1 h-4 bg-brown-600 transform -rotate-45"></div>
        </div>
      </div>
      
      {/* Match Info */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm font-medium text-blue-600">{homeTeam}</div>
          <div className="text-lg font-bold">{homeScore ?? 0}</div>
          <div className="text-xs text-muted-foreground">Sets</div>
        </div>
        
        <div className="text-center">
          {minute && (
            <Badge variant="outline" className="mb-2">
              Set {Math.ceil(minute / 30)}
            </Badge>
          )}
          <div className="text-xs text-muted-foreground">vs</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-red-600">{awayTeam}</div>
          <div className="text-lg font-bold">{awayScore ?? 0}</div>
          <div className="text-xs text-muted-foreground">Sets</div>
        </div>
      </div>
    </div>
  );
};