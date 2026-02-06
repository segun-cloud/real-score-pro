import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'halftime' | 'corner' | 'penalty';
  team: 'home' | 'away';
  player?: string;
  assistedBy?: string;
  playerIn?: string;
  playerOut?: string;
  description?: string;
  score?: { home: number; away: number };
}

interface MatchStats {
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  corners?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  redCards?: { home: number; away: number };
  fouls?: { home: number; away: number };
}

interface LiveMatchTrackerProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeScore: number;
  awayScore: number;
  minute?: number;
  status: 'live' | 'finished' | 'scheduled' | 'halftime';
  events?: MatchEvent[];
  statistics?: MatchStats;
  currentAction?: string; // e.g., "Throw-in", "Corner", "Attack", "Dangerous Attack"
  ballPosition?: { x: number; y: number; zone?: 'home' | 'midfield' | 'away' };
}

export const LiveMatchTracker = ({
  homeTeam,
  awayTeam,
  homeTeamLogo,
  awayTeamLogo,
  homeScore,
  awayScore,
  minute,
  status,
  events = [],
  statistics,
  currentAction,
  ballPosition = { x: 50, y: 50 },
}: LiveMatchTrackerProps) => {
  const [animatedBallPos, setAnimatedBallPos] = useState(ballPosition);

  // Animate ball position smoothly
  useEffect(() => {
    setAnimatedBallPos(ballPosition);
  }, [ballPosition]);

  // Calculate stats from events
  const homeYellowCards = events.filter(e => e.type === 'yellow_card' && e.team === 'home').length;
  const awayYellowCards = events.filter(e => e.type === 'yellow_card' && e.team === 'away').length;
  const homeRedCards = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
  const awayRedCards = events.filter(e => e.type === 'red_card' && e.team === 'away').length;
  const homeCorners = statistics?.corners?.home ?? events.filter(e => e.type === 'corner' && e.team === 'home').length;
  const awayCorners = statistics?.corners?.away ?? events.filter(e => e.type === 'corner' && e.team === 'away').length;

  const getEventIcon = (type: MatchEvent['type']) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔄';
      case 'halftime': return '⏸️';
      case 'corner': return '🚩';
      case 'penalty': return '⚽';
      default: return '•';
    }
  };

  const sortedEvents = [...events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Stadium View with Pitch */}
      <div className="relative rounded-2xl overflow-hidden shadow-strong">
        {/* Dark stadium background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Stadium lights effect */}
        <div className="absolute top-0 left-1/4 w-1/2 h-20 bg-gradient-to-b from-yellow-500/20 to-transparent blur-xl" />
        
        {/* Current action indicator */}
        {currentAction && status === 'live' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
              {homeTeamLogo && (
                <img src={homeTeamLogo} alt="" className="w-5 h-5 object-contain" />
              )}
              <span className="text-xs font-medium text-white">{homeTeam}</span>
              <span className="text-xs text-white/70">•</span>
              <span className="text-xs text-yellow-400 font-semibold">{currentAction}</span>
            </div>
          </div>
        )}
        
        {/* Football Pitch */}
        <div className="relative mx-4 my-6 h-44 rounded-xl overflow-hidden">
          {/* Grass with stripes */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-500 to-green-600">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.05) 20%)`,
            }} />
          </div>
          
          {/* Field markings */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
            {/* Outline */}
            <rect x="2" y="2" width="96" height="56" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
            
            {/* Center line */}
            <line x1="50" y1="2" x2="50" y2="58" stroke="white" strokeWidth="0.4" opacity="0.8" />
            
            {/* Center circle */}
            <circle cx="50" cy="30" r="8" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <circle cx="50" cy="30" r="0.8" fill="white" opacity="0.8" />
            
            {/* Left goal area */}
            <rect x="2" y="18" width="6" height="24" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <rect x="2" y="23" width="3" height="14" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            
            {/* Right goal area */}
            <rect x="92" y="18" width="6" height="24" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <rect x="95" y="23" width="3" height="14" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            
            {/* Left penalty arc */}
            <path d="M 8 22 Q 14 30 8 38" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            
            {/* Right penalty arc */}
            <path d="M 92 22 Q 86 30 92 38" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            
            {/* Corner arcs */}
            <path d="M 2 5 Q 5 2 5 2" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 2 55 Q 5 58 5 58" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 98 5 Q 95 2 95 2" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 98 55 Q 95 58 95 58" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
          </svg>
          
          {/* Ball with glow */}
          {status === 'live' && (
            <div
              className="absolute w-3 h-3 transition-all duration-500 ease-out"
              style={{
                left: `${animatedBallPos.x}%`,
                top: `${animatedBallPos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="absolute inset-0 bg-white rounded-full shadow-lg" />
              <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm animate-pulse" />
            </div>
          )}
          
          {/* Zone indicators */}
          {status === 'live' && (
            <>
              <div className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-16 rounded-lg transition-all duration-300",
                ballPosition.zone === 'home' && "bg-red-500/20 border border-red-400/50"
              )} />
              <div className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-16 rounded-lg transition-all duration-300",
                ballPosition.zone === 'away' && "bg-red-500/20 border border-red-400/50"
              )} />
            </>
          )}
        </div>
      </div>
      
      {/* Live Scoreboard Strip */}
      <Card className={cn(
        "flex items-center justify-between p-3 rounded-2xl",
        status === 'live' && "bg-gradient-to-r from-card via-live/5 to-card border-live/30"
      )}>
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1">
          {homeTeamLogo ? (
            <img src={homeTeamLogo} alt="" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
              {homeTeam.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate max-w-[80px]">{homeTeam}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {homeYellowCards > 0 && <span className="flex items-center gap-0.5">🟨 {homeYellowCards}</span>}
              {homeRedCards > 0 && <span className="flex items-center gap-0.5">🟥 {homeRedCards}</span>}
              <span className="flex items-center gap-0.5">🚩 {homeCorners}</span>
            </div>
          </div>
        </div>
        
        {/* Score & Time */}
        <div className="flex flex-col items-center px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums">{homeScore}</span>
            <span className="text-lg text-muted-foreground">-</span>
            <span className="text-2xl font-bold tabular-nums">{awayScore}</span>
          </div>
          {status === 'live' && minute && (
            <Badge className="gradient-live text-live-foreground text-[10px] px-2 py-0 border-0 mt-1 animate-pulse">
              {minute}'
            </Badge>
          )}
          {status === 'halftime' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 mt-1">
              HT
            </Badge>
          )}
          {status === 'finished' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 mt-1">
              FT
            </Badge>
          )}
        </div>
        
        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="text-right min-w-0">
            <p className="text-sm font-semibold truncate max-w-[80px]">{awayTeam}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
              <span className="flex items-center gap-0.5">🚩 {awayCorners}</span>
              {awayYellowCards > 0 && <span className="flex items-center gap-0.5">🟨 {awayYellowCards}</span>}
              {awayRedCards > 0 && <span className="flex items-center gap-0.5">🟥 {awayRedCards}</span>}
            </div>
          </div>
          {awayTeamLogo ? (
            <img src={awayTeamLogo} alt="" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
              {awayTeam.charAt(0)}
            </div>
          )}
        </div>
      </Card>
      
      {/* Match Events Timeline */}
      {sortedEvents.length > 0 && (
        <Card className="p-4 rounded-2xl">
          <div className="space-y-3">
            {sortedEvents.map((event, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start gap-3 animate-fade-up",
                  event.team === 'home' ? "flex-row" : "flex-row-reverse"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Event content */}
                <div className={cn(
                  "flex-1 flex items-start gap-2",
                  event.team === 'home' ? "flex-row" : "flex-row-reverse text-right"
                )}>
                  {/* Event details */}
                  <div className="flex-1">
                    {event.type === 'substitution' ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5" style={{ flexDirection: event.team === 'home' ? 'row' : 'row-reverse' }}>
                          <ArrowUp className="w-3 h-3 text-success" />
                          <span className="text-sm font-medium">{event.playerIn}</span>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ flexDirection: event.team === 'home' ? 'row' : 'row-reverse' }}>
                          <ArrowDown className="w-3 h-3 text-destructive" />
                          <span className="text-sm text-muted-foreground">{event.playerOut}</span>
                        </div>
                      </div>
                    ) : event.type === 'goal' ? (
                      <div>
                        <div className="flex items-center gap-1.5" style={{ flexDirection: event.team === 'home' ? 'row' : 'row-reverse' }}>
                          <span className="text-sm font-semibold">{event.player}</span>
                          {event.score && (
                            <Badge className="ml-1 bg-foreground text-background text-[10px] px-1.5 py-0">
                              {event.score.home} - [{event.score.away}]
                            </Badge>
                          )}
                        </div>
                        {event.assistedBy && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1" style={{ flexDirection: event.team === 'home' ? 'row' : 'row-reverse' }}>
                            <span>🅰️</span> {event.assistedBy}
                          </p>
                        )}
                      </div>
                    ) : event.type === 'halftime' ? (
                      <div className="w-full text-center py-2">
                        <span className="text-sm font-semibold text-primary">HT {event.score?.home} - {event.score?.away}</span>
                      </div>
                    ) : (
                      <span className="text-sm">{event.player || event.description}</span>
                    )}
                  </div>
                </div>
                
                {/* Minute badge (centered) */}
                <div className="flex flex-col items-center gap-1 w-10 flex-shrink-0">
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">{event.minute}'</span>
                </div>
                
                {/* Spacer for alignment */}
                <div className="flex-1" />
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Key Stats Bar */}
      {statistics && (
        <Card className="p-4 rounded-2xl">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span>📊</span> Key Stats
          </h4>
          
          {/* Possession bar */}
          {statistics.possession && (
            <div className="mb-4">
              <div className="flex justify-between items-center text-sm mb-1.5">
                <span className="font-bold text-yellow-500">{statistics.possession.home}%</span>
                <span className="text-xs text-muted-foreground">Ball Possession</span>
                <span className="font-bold text-cyan-500">{statistics.possession.away}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                <div 
                  className="bg-yellow-500 transition-all duration-500"
                  style={{ width: `${statistics.possession.home}%` }}
                />
                <div 
                  className="bg-cyan-500 transition-all duration-500"
                  style={{ width: `${statistics.possession.away}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Quick stats grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {statistics.corners && (
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-yellow-500">{statistics.corners.home}</span>
                  <span className="text-lg">🚩</span>
                  <span className="text-cyan-500">{statistics.corners.away}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Corners</span>
              </div>
            )}
            
            {statistics.shots && (
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-yellow-500">{statistics.shots.home}</span>
                  <span className="text-lg">🥅</span>
                  <span className="text-cyan-500">{statistics.shots.away}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Shots</span>
              </div>
            )}
            
            {(statistics.yellowCards || true) && (
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-yellow-500">{statistics.yellowCards?.home ?? homeYellowCards}</span>
                  <span className="text-lg">🟨</span>
                  <span className="text-cyan-500">{statistics.yellowCards?.away ?? awayYellowCards}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Cards</span>
              </div>
            )}
            
            {statistics.fouls && (
              <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-yellow-500">{statistics.fouls.home}</span>
                  <span className="text-lg">⚠️</span>
                  <span className="text-cyan-500">{statistics.fouls.away}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Fouls</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
