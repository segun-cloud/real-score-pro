import { Badge } from "@/components/ui/badge";
import { useFootballSimEngine } from "@/hooks/useFootballSimEngine";
import { useMemo } from "react";

interface FootballTrackerProps {
  homeTeam: string;
  awayTeam: string;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  isSimulating?: boolean;
  ballPosition?: { x: number; y: number };
  currentEvent?: { type: string; team: 'home' | 'away' } | null;
  /** Real match phase from API */
  livePhase?: 'safe' | 'attack' | 'dangerous_attack' | 'setpiece' | 'goal' | null;
  /** Which team is attacking */
  liveAttackingTeam?: 'home' | 'away' | null;
}

export const FootballTracker = ({
  homeTeam,
  awayTeam,
  minute,
  homeScore,
  awayScore,
  isSimulating = false,
  ballPosition,
  currentEvent,
  livePhase,
  liveAttackingTeam,
}: FootballTrackerProps) => {
  const engine = useFootballSimEngine({
    isSimulating,
    currentEvent: currentEvent as any,
    ballPosition,
    homeTeam,
    awayTeam,
    livePhase,
    liveAttackingTeam,
  });

  // Derive display label from live phase
  const phaseLabel = useMemo(() => {
    if (!livePhase || !isSimulating) return null;
    switch (livePhase) {
      case 'dangerous_attack': return 'Dangerous Attack';
      case 'attack': return 'Attack';
      case 'setpiece': return 'Set Piece';
      case 'goal': return 'GOAL!';
      case 'safe': return 'Safe';
      default: return null;
    }
  }, [livePhase, isSimulating]);

  const phaseLabelColor = useMemo(() => {
    switch (livePhase) {
      case 'dangerous_attack': return 'text-red-400';
      case 'attack': return 'text-amber-400';
      case 'setpiece': return 'text-cyan-400';
      case 'goal': return 'text-green-400';
      default: return 'text-white/70';
    }
  }, [livePhase]);

  const pressureGradient = useMemo(() => {
    const zone = engine.pressureZone;
    const intensity = Math.abs(zone - 50) / 50;
    if (zone > 55) {
      return `radial-gradient(ellipse at ${zone}% 50%, rgba(59, 130, 246, ${0.08 + intensity * 0.12}) 0%, transparent 60%)`;
    } else if (zone < 45) {
      return `radial-gradient(ellipse at ${zone}% 50%, rgba(239, 68, 68, ${0.08 + intensity * 0.12}) 0%, transparent 60%)`;
    }
    return 'none';
  }, [engine.pressureZone]);

  return (
    <div className="bg-card p-3 rounded-lg">
      {/* Live phase indicator */}
      {phaseLabel && liveAttackingTeam && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">
            {liveAttackingTeam === 'home' ? homeTeam : awayTeam}
          </span>
          <Badge variant="outline" className={`text-xs font-semibold ${phaseLabelColor}`}>
            {phaseLabel}
          </Badge>
        </div>
      )}

      {/* Pitch */}
      <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/10' }}>
        {/* Grass background with stripes */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 to-emerald-700">
          {/* Grass stripes */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                left: `${(i / 8) * 100}%`,
                width: `${100 / 8}%`,
                backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'transparent',
              }}
            />
          ))}
        </div>

        {/* Field lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Border */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.4" />
          {/* Center line */}
          <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" />
          {/* Center circle */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.7)" />
          {/* Home penalty area */}
          <rect x="2" y="22" width="14" height="56" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" />
          {/* Home goal area */}
          <rect x="2" y="35" width="6" height="30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" />
          {/* Home goal */}
          <rect x="0" y="40" width="2" height="20" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" />
          {/* Away penalty area */}
          <rect x="84" y="22" width="14" height="56" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" />
          {/* Away goal area */}
          <rect x="92" y="35" width="6" height="30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" />
          {/* Away goal */}
          <rect x="98" y="40" width="2" height="20" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" />
          {/* Penalty spots */}
          <circle cx="12" cy="50" r="0.5" fill="rgba(255,255,255,0.7)" />
          <circle cx="88" cy="50" r="0.5" fill="rgba(255,255,255,0.7)" />
          {/* Corner arcs */}
          <path d="M 2 5 A 3 3 0 0 1 5 2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
          <path d="M 95 2 A 3 3 0 0 1 98 5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
          <path d="M 2 95 A 3 3 0 0 0 5 98" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
          <path d="M 95 98 A 3 3 0 0 0 98 95" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
        </svg>

        {/* Pressure zone overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{ background: pressureGradient }}
        />

        {/* Ball trail */}
        {isSimulating && engine.ballTrail.map((point, i) => {
          const age = (Date.now() - point.timestamp) / 500;
          const opacity = Math.max(0, 0.3 - age * 0.3);
          const size = Math.max(0, 0.6 - age * 0.4);
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white pointer-events-none"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                width: `${size}rem`,
                height: `${size}rem`,
                opacity,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}

        {/* Passing lines */}
        {isSimulating && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {engine.passingLines.map((line, i) => {
              const age = (Date.now() - line.timestamp) / 800;
              const opacity = Math.max(0, 0.6 - age * 0.6);
              return (
                <line
                  key={i}
                  x1={line.fromX}
                  y1={line.fromY}
                  x2={line.toX}
                  y2={line.toY}
                  stroke={line.type === 'shot' ? '#fbbf24' : line.team === 'home' ? '#60a5fa' : '#f87171'}
                  strokeWidth={line.type === 'shot' ? '0.6' : '0.3'}
                  strokeDasharray={line.type === 'shot' ? 'none' : '1 1'}
                  opacity={opacity}
                />
              );
            })}
          </svg>
        )}

        {/* Players */}
        {engine.players.map((player) => (
          <div
            key={player.id}
            className="absolute pointer-events-none"
            style={{
              left: `${player.x}%`,
              top: `${player.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: isSimulating ? 'none' : 'left 0.3s, top 0.3s',
            }}
          >
            {/* Player dot */}
            <div
              className={`rounded-full border border-white/60 shadow-md ${
                player.team === 'home'
                  ? 'bg-blue-500'
                  : 'bg-red-500'
              } ${player.role === 'GK' ? 'bg-yellow-400' : ''} ${
                player.hasBall ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''
              }`}
              style={{
                width: player.role === 'GK' ? '0.6rem' : '0.5rem',
                height: player.role === 'GK' ? '0.6rem' : '0.5rem',
              }}
            />
          </div>
        ))}

        {/* Ball */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: `${isSimulating ? engine.ballX : (ballPosition?.x ?? 50)}%`,
            top: `${isSimulating ? engine.ballY : (ballPosition?.y ?? 50)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-lg shadow-black/30 border border-gray-200" />
        </div>

        {/* Goal celebration overlay */}
        {engine.isGoalCelebration && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 animate-fade-in">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-white drop-shadow-lg animate-bounce">
                ⚽ GOAL!
              </div>
              <div className={`text-sm font-bold mt-1 ${
                engine.goalTeam === 'home' ? 'text-blue-300' : 'text-red-300'
              }`}>
                {engine.goalTeam === 'home' ? homeTeam : awayTeam}
              </div>
            </div>
          </div>
        )}

        {/* Team labels on pitch */}
        <div className="absolute top-1 left-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">
          {homeTeam}
        </div>
        <div className="absolute top-1 right-3 text-[10px] font-semibold text-white/60 uppercase tracking-wider">
          {awayTeam}
        </div>
      </div>

      {/* Stats bar below pitch */}
      <div className="mt-3 space-y-2">
        {/* Score & minute */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-bold">{homeTeam}</span>
            <span className="text-xl font-black">{homeScore ?? 0}</span>
          </div>

          <div className="text-center">
            {minute != null && minute > 0 && (
              <Badge variant="outline" className="text-xs font-mono">
                {minute}'
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-black">{awayScore ?? 0}</span>
            <span className="text-sm font-bold">{awayTeam}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
        </div>

        {/* Possession bar */}
        {isSimulating && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Possession {engine.possessionPercent}%</span>
              <span>{100 - engine.possessionPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all duration-500 rounded-l-full"
                style={{ width: `${engine.possessionPercent}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500 rounded-r-full"
                style={{ width: `${100 - engine.possessionPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
