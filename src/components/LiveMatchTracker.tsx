import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  currentAction?: string;
  ballPosition?: { x: number; y: number; zone?: 'home' | 'midfield' | 'away' };
  // FIX: added livePhase and liveAttackingTeam props (wired from useMatchPhaseTracker via MatchDetails)
  livePhase?: 'safe' | 'attack' | 'dangerous_attack' | 'setpiece' | 'goal';
  liveAttackingTeam?: 'home' | 'away' | null;
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
  livePhase,
  liveAttackingTeam,
}: LiveMatchTrackerProps) => {
  // FIX: removed animatedBallPos state — it was always identical to ballPosition
  // since setState is synchronous and CSS transition handles the visual smoothing.
  // Just use ballPosition directly with the CSS transition on the ball element.

  // Stats derived from events as fallback
  const homeYellowCards = events.filter(e => e.type === 'yellow_card' && e.team === 'home').length;
  const awayYellowCards = events.filter(e => e.type === 'yellow_card' && e.team === 'away').length;
  const homeRedCards = events.filter(e => e.type === 'red_card' && e.team === 'home').length;
  const awayRedCards = events.filter(e => e.type === 'red_card' && e.team === 'away').length;
  const homeCorners = statistics?.corners?.home ?? events.filter(e => e.type === 'corner' && e.team === 'home').length;
  const awayCorners = statistics?.corners?.away ?? events.filter(e => e.type === 'corner' && e.team === 'away').length;

  // FIX: derive attacking team display from liveAttackingTeam prop
  const attackingTeamName = liveAttackingTeam === 'home' ? homeTeam
    : liveAttackingTeam === 'away' ? awayTeam
    : homeTeam; // fallback to home if unknown
  const attackingTeamLogo = liveAttackingTeam === 'away' ? awayTeamLogo : homeTeamLogo;

  // Phase glow color on the pitch ball
  const phaseGlowColor = livePhase === 'dangerous_attack' ? 'bg-red-400/40'
    : livePhase === 'setpiece' ? 'bg-yellow-400/40'
    : livePhase === 'attack' ? 'bg-orange-400/30'
    : 'bg-white/30';

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

      {/* ── Pitch ──────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden shadow-strong">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 left-1/4 w-1/2 h-20 bg-gradient-to-b from-yellow-500/20 to-transparent blur-xl" />

        {/* FIX: action indicator now shows the ATTACKING team, not always home */}
        {currentAction && status === 'live' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
              {attackingTeamLogo && (
                <img src={attackingTeamLogo} alt="" className="w-5 h-5 object-contain" />
              )}
              <span className="text-xs font-medium text-white">{attackingTeamName}</span>
              <span className="text-xs text-white/70">•</span>
              <span className={cn(
                "text-xs font-semibold",
                livePhase === 'dangerous_attack' ? "text-red-400" :
                livePhase === 'setpiece' ? "text-yellow-400" :
                "text-orange-400"
              )}>
                {currentAction}
              </span>
            </div>
          </div>
        )}

        <div className="relative mx-4 my-6 h-44 rounded-xl overflow-hidden">
          {/* Grass */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-500 to-green-600">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.05) 20%)`,
            }} />
          </div>

          {/* Field markings */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="56" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
            <line x1="50" y1="2" x2="50" y2="58" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <circle cx="50" cy="30" r="8" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <circle cx="50" cy="30" r="0.8" fill="white" opacity="0.8" />
            <rect x="2" y="18" width="6" height="24" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <rect x="2" y="23" width="3" height="14" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <rect x="92" y="18" width="6" height="24" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <rect x="95" y="23" width="3" height="14" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 8 22 Q 14 30 8 38" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 92 22 Q 86 30 92 38" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 2 5 Q 5 2 5 2" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 2 55 Q 5 58 5 58" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 98 5 Q 95 2 95 2" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
            <path d="M 98 55 Q 95 58 95 58" fill="none" stroke="white" strokeWidth="0.4" opacity="0.8" />
          </svg>

          {/* FIX: ball uses ballPosition directly — CSS transition handles smoothing */}
          {status === 'live' && (
            <div
              className="absolute w-3 h-3 transition-all duration-500 ease-out"
              style={{
                left: `${ballPosition.x}%`,
                top: `${ballPosition.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="absolute inset-0 bg-white rounded-full shadow-lg" />
              {/* FIX: glow color reflects current phase */}
              <div className={cn(
                "absolute -inset-1 rounded-full blur-sm animate-pulse",
                phaseGlowColor
              )} />
              {/* Extra pulse ring for dangerous attack */}
              {livePhase === 'dangerous_attack' && (
                <div className="absolute -inset-2 bg-red-500/20 rounded-full blur-md animate-ping" />
              )}
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

      {/* ── Scoreboard ─────────────────────────────────────────────────────── */}
      <Card className={cn(
        "flex items-center justify-between p-3 rounded-2xl",
        status === 'live' && "bg-gradient-to-r from-card via-live/5 to-card border-live/30"
      )}>
        {/* Home */}
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
              {homeYellowCards > 0 && <span>🟨 {homeYellowCards}</span>}
              {homeRedCards > 0 && <span>🟥 {homeRedCards}</span>}
              <span>🚩 {homeCorners}</span>
            </div>
          </div>
        </div>

        {/* Score */}
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
            <Badge variant="secondary" className="text-[10px] px-2 py-0 mt-1">HT</Badge>
          )}
          {status === 'finished' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 mt-1">FT</Badge>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="text-right min-w-0">
            <p className="text-sm font-semibold truncate max-w-[80px]">{awayTeam}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
              <span>🚩 {awayCorners}</span>
              {awayYellowCards > 0 && <span>🟨 {awayYellowCards}</span>}
              {awayRedCards > 0 && <span>🟥 {awayRedCards}</span>}
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

      {/* ── Events Timeline ─────────────────────────────────────────────────── */}
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
                <div className={cn(
                  "flex-1 flex items-start gap-2",
                  event.team === 'home' ? "flex-row" : "flex-row-reverse text-right"
                )}>
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
                          {/* FIX: brackets highlight the SCORING team's score, not always away */}
                          {event.score && (
                            <Badge className="ml-1 bg-foreground text-background text-[10px] px-1.5 py-0">
                              {event.team === 'home'
                                ? `[${event.score.home}] - ${event.score.away}`
                                : `${event.score.home} - [${event.score.away}]`}
                            </Badge>
                          )}
                        </div>
                        {event.assistedBy && (
                          <p
                            className="text-xs text-muted-foreground flex items-center gap-1"
                            style={{ flexDirection: event.team === 'home' ? 'row' : 'row-reverse' }}
                          >
                            <span>🅰️</span> {event.assistedBy}
                          </p>
                        )}
                      </div>
                    ) : event.type === 'halftime' ? (
                      <div className="w-full text-center py-2">
                        <span className="text-sm font-semibold text-primary">
                          HT {event.score?.home} - {event.score?.away}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm">{event.player || event.description}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 w-10 flex-shrink-0">
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">{event.minute}'</span>
                </div>

                <div className="flex-1" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Key Stats ───────────────────────────────────────────────────────── */}
      {statistics && (
        <Card className="p-4 rounded-2xl">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span>📊</span> Key Stats
          </h4>

          {statistics.possession && (
            <div className="mb-4">
              <div className="flex justify-between items-center text-sm mb-1.5">
                <span className="font-bold text-yellow-500">{statistics.possession.home}%</span>
                <span className="text-xs text-muted-foreground">Ball Possession</span>
                <span className="font-bold text-cyan-500">{statistics.possession.away}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${statistics.possession.home}%` }} />
                <div className="bg-cyan-500 transition-all duration-500" style={{ width: `${statistics.possession.away}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-center">
            {statistics.corners && (
              <StatCell home={statistics.corners.home} away={statistics.corners.away} icon="🚩" label="Corners" />
            )}
            {statistics.shots && (
              <StatCell home={statistics.shots.home} away={statistics.shots.away} icon="🥅" label="Shots" />
            )}
            {/* FIX: removed `|| true` — only renders when cards data actually exists */}
            {(statistics.yellowCards || homeYellowCards > 0 || awayYellowCards > 0) && (
              <StatCell
                home={statistics.yellowCards?.home ?? homeYellowCards}
                away={statistics.yellowCards?.away ?? awayYellowCards}
                icon="🟨"
                label="Cards"
              />
            )}
            {statistics.fouls && (
              <StatCell home={statistics.fouls.home} away={statistics.fouls.away} icon="⚠️" label="Fouls" />
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

// ── Helper ────────────────────────────────────────────────────────────────────

const StatCell = ({ home, away, icon, label }: {
  home: number; away: number; icon: string; label: string;
}) => (
  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50">
    <div className="flex items-center gap-2 text-sm font-bold">
      <span className="text-yellow-500">{home}</span>
      <span className="text-lg">{icon}</span>
      <span className="text-cyan-500">{away}</span>
    </div>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);
