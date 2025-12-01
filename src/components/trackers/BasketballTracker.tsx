import { Badge } from "@/components/ui/badge";

interface BasketballTrackerProps {
  homeTeam: string;
  awayTeam: string;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  isSimulating?: boolean;
  ballPosition?: { x: number; y: number };
  currentEvent?: { type: string; team: 'home' | 'away' };
}

export const BasketballTracker = ({ homeTeam, awayTeam, minute, homeScore, awayScore, isSimulating, ballPosition, currentEvent }: BasketballTrackerProps) => {
  return (
    <div className="bg-card p-4 rounded-lg">
      <div className="relative bg-orange-200 rounded-lg p-4 h-64 overflow-hidden">
        {/* Basketball Court */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-300 to-orange-400">
          {/* Court lines */}
          <div className="absolute inset-0 border-2 border-white">
            {/* Center line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            {/* Three-point lines (simplified) */}
            <div className="absolute left-0 top-8 w-20 h-2 bg-white rounded-r-full"></div>
            <div className="absolute right-0 top-8 w-20 h-2 bg-white rounded-l-full"></div>
            <div className="absolute left-0 bottom-8 w-20 h-2 bg-white rounded-r-full"></div>
            <div className="absolute right-0 bottom-8 w-20 h-2 bg-white rounded-l-full"></div>
            {/* Free throw circles */}
            <div className="absolute left-8 top-1/2 w-12 h-12 border-2 border-white rounded-full transform -translate-y-1/2"></div>
            <div className="absolute right-8 top-1/2 w-12 h-12 border-2 border-white rounded-full transform -translate-y-1/2"></div>
          </div>
          
          {/* Hoops */}
          <div className="absolute left-2 top-1/2 w-4 h-1 bg-orange-600 rounded transform -translate-y-1/2"></div>
          <div className="absolute right-2 top-1/2 w-4 h-1 bg-orange-600 rounded transform -translate-y-1/2"></div>
          
          {/* Ball */}
          <div 
            className="absolute w-3 h-3 bg-orange-600 rounded-full shadow-lg transition-all duration-300"
            style={{
              left: isSimulating && ballPosition ? `${ballPosition.x}%` : '66%',
              top: isSimulating && ballPosition ? `${ballPosition.y}%` : '33%',
              transform: 'translate(-50%, -50%)'
            }}
          />
          
          {/* Basket Animation */}
          {currentEvent?.type === 'basket' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-fade-in">
              <div className="text-5xl font-bold text-white animate-bounce">
                🏀 SCORE!
              </div>
            </div>
          )}
          
          {/* Players */}
          <div className="absolute top-12 left-16 w-2 h-2 bg-purple-500 rounded-full"></div>
          <div className="absolute top-20 left-24 w-2 h-2 bg-purple-500 rounded-full"></div>
          <div className="absolute top-28 left-12 w-2 h-2 bg-purple-500 rounded-full"></div>
          <div className="absolute top-12 right-16 w-2 h-2 bg-yellow-500 rounded-full"></div>
          <div className="absolute top-20 right-24 w-2 h-2 bg-yellow-500 rounded-full"></div>
          <div className="absolute top-28 right-12 w-2 h-2 bg-yellow-500 rounded-full"></div>
        </div>
      </div>
      
      {/* Match Info */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm font-medium text-purple-600">{homeTeam}</div>
          <div className="text-2xl font-bold">{homeScore ?? 0}</div>
        </div>
        
        <div className="text-center">
          {minute && (
            <Badge variant="outline" className="mb-2">
              Q{Math.ceil(minute / 12)} - {minute % 12 || 12}:00
            </Badge>
          )}
          <div className="text-xs text-muted-foreground">vs</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-yellow-600">{awayTeam}</div>
          <div className="text-2xl font-bold">{awayScore ?? 0}</div>
        </div>
      </div>
    </div>
  );
};