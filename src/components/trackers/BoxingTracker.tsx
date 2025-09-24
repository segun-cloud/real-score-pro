import { Badge } from "@/components/ui/badge";

interface BoxingTrackerProps {
  homeTeam: string;
  awayTeam: string;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
}

export const BoxingTracker = ({ homeTeam, awayTeam, minute, homeScore, awayScore }: BoxingTrackerProps) => {
  return (
    <div className="bg-card p-4 rounded-lg">
      <div className="relative bg-blue-900 rounded-lg p-4 h-64 overflow-hidden">
        {/* Boxing Ring */}
        <div className="absolute inset-4 border-4 border-red-500 bg-gradient-to-br from-blue-800 to-blue-900">
          {/* Ring canvas */}
          <div className="absolute inset-2 bg-gray-200 border border-white">
            {/* Center logo/circle */}
            <div className="absolute top-1/2 left-1/2 w-8 h-8 border-2 border-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Corner posts */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-red-600 rounded-full"></div>
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-red-600 rounded-full"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-red-600 rounded-full"></div>
            
            {/* Ropes */}
            <div className="absolute top-2 left-0 right-0 h-0.5 bg-white"></div>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white transform -translate-y-1/2"></div>
            <div className="absolute bottom-2 left-0 right-0 h-0.5 bg-white"></div>
            
            <div className="absolute top-0 bottom-0 left-2 w-0.5 bg-white"></div>
            <div className="absolute top-0 bottom-0 right-2 w-0.5 bg-white"></div>
          </div>
          
          {/* Boxers */}
          <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-blue-500 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
          
          {/* Boxing gloves (simplified) */}
          <div className="absolute top-1/2 left-1/4 w-2 h-1 bg-red-600 rounded transform -translate-y-2"></div>
          <div className="absolute top-1/2 right-1/4 w-2 h-1 bg-blue-600 rounded transform -translate-y-2"></div>
        </div>
        
        {/* Ring lights */}
        <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-300 rounded-full opacity-80"></div>
        <div className="absolute top-0 right-1/4 w-2 h-2 bg-yellow-300 rounded-full opacity-80"></div>
      </div>
      
      {/* Match Info */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm font-medium text-red-600">{homeTeam}</div>
          <div className="text-lg font-bold">{homeScore ?? 0}</div>
          <div className="text-xs text-muted-foreground">Wins</div>
        </div>
        
        <div className="text-center">
          {minute && (
            <Badge variant="outline" className="mb-2">
              Round {Math.ceil(minute / 3)}
            </Badge>
          )}
          <div className="text-xs text-muted-foreground">vs</div>
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium text-blue-600">{awayTeam}</div>
          <div className="text-lg font-bold">{awayScore ?? 0}</div>
          <div className="text-xs text-muted-foreground">Wins</div>
        </div>
      </div>
    </div>
  );
};