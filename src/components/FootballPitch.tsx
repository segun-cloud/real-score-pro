import { Player } from "@/types/sports";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FootballPitchProps {
  players: Player[];
  formation: string;
  teamName: string;
  isHome?: boolean;
}

export const FootballPitch = ({ players, formation, teamName, isHome = true }: FootballPitchProps) => {
  const starters = players.filter(p => !p.isSubstitute);
  
  // Parse formation (e.g., "4-3-3" => [4, 3, 3])
  const formationLines = formation.split('-').map(Number);
  
  // Group players by position lines
  const getPlayersByLine = () => {
    const gk = starters.filter(p => p.position === 'GK');
    const defenders = starters.filter(p => ['CB', 'LB', 'RB'].includes(p.position));
    const midfielders = starters.filter(p => ['CM', 'CDM', 'CAM'].includes(p.position));
    const forwards = starters.filter(p => ['ST', 'CF', 'LW', 'RW'].includes(p.position));
    
    return [gk, defenders, midfielders, forwards].filter(line => line.length > 0);
  };

  const playerLines = getPlayersByLine();
  const teamColor = isHome ? "from-emerald-500 to-green-600" : "from-blue-500 to-indigo-600";
  const bgColor = isHome ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-blue-50 dark:bg-blue-950/20";

  return (
    <div className={cn("relative rounded-lg overflow-hidden", bgColor)}>
      {/* Team Header */}
      <div className="text-center py-2 border-b border-border/50">
        <h4 className="text-sm font-semibold">{teamName}</h4>
        <p className="text-xs text-muted-foreground">{formation}</p>
      </div>

      {/* Football Pitch */}
      <div className="relative p-4 min-h-[320px]">
        {/* Pitch background with lines */}
        <div className="absolute inset-4 bg-gradient-to-b from-green-600/10 to-green-700/10 rounded-lg border-2 border-white/20">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/20 rounded-full"></div>
          {/* Center line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20"></div>
          {/* Penalty box top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-12 border-2 border-t-0 border-white/20"></div>
          {/* Penalty box bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 border-2 border-b-0 border-white/20"></div>
        </div>

        {/* Players positioned on pitch */}
        <div className="relative z-10 h-[280px] flex flex-col justify-between py-2">
          {playerLines.map((line, lineIndex) => (
            <div key={lineIndex} className="flex justify-center gap-2">
              {line.map((player) => (
                <div key={player.number} className="flex flex-col items-center gap-1 min-w-[60px]">
                  {/* Player jersey circle */}
                  <div className={cn(
                    "relative w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg",
                    `bg-gradient-to-br ${teamColor}`,
                    "transition-transform hover:scale-110"
                  )}>
                    {player.number}
                    {player.captain && (
                      <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  {/* Player name */}
                  <span className="text-[10px] font-medium text-center leading-tight max-w-[60px] truncate">
                    {player.name.split(' ').pop()}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
