import { useState, useEffect, useRef, useCallback } from 'react';

export interface PlayerPosition {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  team: 'home' | 'away';
  role: string;
  hasBall: boolean;
}

export interface BallTrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface PassingLine {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  team: 'home' | 'away';
  type: 'pass' | 'shot';
  timestamp: number;
}

export interface SimEngineState {
  players: PlayerPosition[];
  ballX: number;
  ballY: number;
  ballTrail: BallTrailPoint[];
  possession: 'home' | 'away';
  possessionPercent: number; // 0-100, home perspective
  pressureZone: number; // 0-100, 0=home goal, 100=away goal
  passingLines: PassingLine[];
  phase: 'buildup' | 'attack' | 'defense' | 'transition' | 'setpiece';
  isGoalCelebration: boolean;
  goalTeam: 'home' | 'away' | null;
}

// 4-3-3 formation base positions (percentage of pitch)
const HOME_FORMATION: Array<{ x: number; y: number; role: string }> = [
  { x: 5, y: 50, role: 'GK' },
  { x: 20, y: 15, role: 'LB' },
  { x: 18, y: 37, role: 'CB' },
  { x: 18, y: 63, role: 'CB' },
  { x: 20, y: 85, role: 'RB' },
  { x: 35, y: 22, role: 'CM' },
  { x: 33, y: 50, role: 'CM' },
  { x: 35, y: 78, role: 'CM' },
  { x: 48, y: 12, role: 'LW' },
  { x: 50, y: 50, role: 'ST' },
  { x: 48, y: 88, role: 'RW' },
];

const AWAY_FORMATION: Array<{ x: number; y: number; role: string }> = HOME_FORMATION.map(p => ({
  x: 100 - p.x,
  y: 100 - p.y,
  role: p.role,
}));

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function addJitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * amount;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface UseFootballSimEngineProps {
  isSimulating: boolean;
  currentEvent?: { type: string; team: 'home' | 'away'; minute?: number } | null;
  ballPosition?: { x: number; y: number };
  homeTeam: string;
  awayTeam: string;
  /** Real match phase from API data — overrides random micro-events when provided */
  livePhase?: 'safe' | 'attack' | 'dangerous_attack' | 'setpiece' | 'goal' | null;
  /** Which team is attacking, from API data */
  liveAttackingTeam?: 'home' | 'away' | null;
}

export const useFootballSimEngine = ({
  isSimulating,
  currentEvent,
  ballPosition,
  livePhase,
  liveAttackingTeam,
}: UseFootballSimEngineProps) => {
  const [state, setState] = useState<SimEngineState>(() => initState());
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const microEventTimerRef = useRef<number>(0);
  const possessionCounterRef = useRef({ home: 50, away: 50 });
  const targetBallRef = useRef({ x: 50, y: 50 });
  const currentBallRef = useRef({ x: 50, y: 50 });
  const ballCarrierRef = useRef<number>(9); // ST starts with ball
  const phaseRef = useRef<SimEngineState['phase']>('buildup');

  function initState(): SimEngineState {
    const players: PlayerPosition[] = [
      ...HOME_FORMATION.map((p, i) => ({
        id: i,
        x: p.x,
        y: p.y,
        baseX: p.x,
        baseY: p.y,
        team: 'home' as const,
        role: p.role,
        hasBall: i === 9,
      })),
      ...AWAY_FORMATION.map((p, i) => ({
        id: i + 11,
        x: p.x,
        y: p.y,
        baseX: p.x,
        baseY: p.y,
        team: 'away' as const,
        role: p.role,
        hasBall: false,
      })),
    ];

    return {
      players,
      ballX: 50,
      ballY: 50,
      ballTrail: [],
      possession: 'home',
      possessionPercent: 50,
      pressureZone: 50,
      passingLines: [],
      phase: 'buildup',
      isGoalCelebration: false,
      goalTeam: null,
    };
  }

  // Get teammates of current possession team
  const getTeamPlayers = useCallback((players: PlayerPosition[], team: 'home' | 'away') => {
    return players.filter(p => p.team === team && p.role !== 'GK');
  }, []);

  // Generate a micro-event (pass between players)
  const generateMicroEvent = useCallback((currentState: SimEngineState): SimEngineState => {
    const { players, possession } = currentState;
    const teamPlayers = getTeamPlayers(players, possession);
    const carrier = players.find(p => p.hasBall) || teamPlayers[Math.floor(Math.random() * teamPlayers.length)];

    // Decide event: 70% pass, 15% dribble, 10% turnover, 5% shot attempt
    const roll = Math.random();
    let newPossession = possession;
    let newPhase = phaseRef.current;

    const updatedPlayers = players.map(p => ({ ...p, hasBall: false }));
    let targetPlayer: PlayerPosition;
    let newPassingLines = currentState.passingLines.filter(
      l => Date.now() - l.timestamp < 800
    );

    if (roll < 0.70) {
      // Pass to teammate
      const candidates = teamPlayers.filter(p => p.id !== carrier.id);
      targetPlayer = candidates[Math.floor(Math.random() * candidates.length)];
      updatedPlayers[targetPlayer.id >= 11 ? targetPlayer.id - 11 + 11 : targetPlayer.id].hasBall = true;
      ballCarrierRef.current = targetPlayer.id;
      targetBallRef.current = { x: targetPlayer.x, y: targetPlayer.y };

      newPassingLines.push({
        fromX: carrier.x,
        fromY: carrier.y,
        toX: targetPlayer.x,
        toY: targetPlayer.y,
        team: possession,
        type: 'pass',
        timestamp: Date.now(),
      });

      // Determine phase based on ball position
      const ballX = targetPlayer.x;
      if (possession === 'home') {
        newPhase = ballX > 65 ? 'attack' : ballX > 35 ? 'buildup' : 'defense';
      } else {
        newPhase = ballX < 35 ? 'attack' : ballX < 65 ? 'buildup' : 'defense';
      }
    } else if (roll < 0.85) {
      // Dribble (carrier keeps ball, moves slightly)
      const idx = carrier.id >= 11 ? carrier.id - 11 + 11 : carrier.id;
      updatedPlayers[idx].hasBall = true;
      const driftX = possession === 'home' ? 3 : -3;
      const newX = clamp(carrier.x + driftX + (Math.random() - 0.5) * 4, 3, 97);
      const newY = clamp(carrier.y + (Math.random() - 0.5) * 6, 5, 95);
      updatedPlayers[idx].x = newX;
      updatedPlayers[idx].y = newY;
      targetBallRef.current = { x: newX, y: newY };
      ballCarrierRef.current = carrier.id;
    } else if (roll < 0.95) {
      // Turnover
      const oppTeam = possession === 'home' ? 'away' : 'home';
      const oppPlayers = getTeamPlayers(updatedPlayers, oppTeam);
      targetPlayer = oppPlayers[Math.floor(Math.random() * oppPlayers.length)];
      const idx = targetPlayer.id >= 11 ? targetPlayer.id - 11 + 11 : targetPlayer.id;
      updatedPlayers[idx].hasBall = true;
      newPossession = oppTeam;
      ballCarrierRef.current = targetPlayer.id;
      targetBallRef.current = { x: targetPlayer.x, y: targetPlayer.y };
      newPhase = 'transition';
    } else {
      // Shot attempt (ball goes toward goal, then comes back)
      const goalX = possession === 'home' ? 96 : 4;
      targetBallRef.current = { x: goalX, y: addJitter(50, 20) };
      newPassingLines.push({
        fromX: carrier.x,
        fromY: carrier.y,
        toX: goalX,
        toY: 50,
        team: possession,
        type: 'shot',
        timestamp: Date.now(),
      });
      // Ball returns to GK after shot
      setTimeout(() => {
        const gkTeam = possession === 'home' ? 'away' : 'home';
        const gkIdx = gkTeam === 'home' ? 0 : 11;
        targetBallRef.current = { x: updatedPlayers[gkIdx].x, y: updatedPlayers[gkIdx].y };
        ballCarrierRef.current = gkIdx;
      }, 600);
      newPhase = 'attack';
    }

    // Update possession counter
    if (newPossession === 'home') {
      possessionCounterRef.current.home += 1;
    } else {
      possessionCounterRef.current.away += 1;
    }
    const total = possessionCounterRef.current.home + possessionCounterRef.current.away;
    const possPercent = Math.round((possessionCounterRef.current.home / total) * 100);

    // Calculate pressure zone
    const avgBallX = targetBallRef.current.x;
    const pressureZone = avgBallX;

    phaseRef.current = newPhase;

    return {
      ...currentState,
      players: updatedPlayers,
      possession: newPossession,
      possessionPercent: possPercent,
      pressureZone: pressureZone,
      passingLines: newPassingLines,
      phase: newPhase,
    };
  }, [getTeamPlayers]);

  // Shift player positions based on phase and possession
  const shiftFormations = useCallback((players: PlayerPosition[], possession: 'home' | 'away', phase: string): PlayerPosition[] => {
    return players.map(p => {
      let shiftX = 0;
      const isAttackingTeam = p.team === possession;

      if (p.role === 'GK') {
        // GK stays mostly put
        const targetX = p.baseX + (isAttackingTeam ? 2 : -1);
        p.x = lerp(p.x, clamp(addJitter(targetX, 1), 2, 98), 0.03);
        p.y = lerp(p.y, addJitter(p.baseY, 3), 0.03);
        return p;
      }

      if (isAttackingTeam) {
        shiftX = phase === 'attack' ? 12 : phase === 'buildup' ? 5 : -5;
      } else {
        shiftX = phase === 'attack' ? -8 : phase === 'buildup' ? -3 : 5;
      }

      // Mirror shift for away team
      if (p.team === 'away') shiftX = -shiftX;

      const targetX = clamp(p.baseX + shiftX, 3, 97);
      const targetY = clamp(p.baseY + (Math.random() - 0.5) * 6, 5, 95);

      p.x = lerp(p.x, addJitter(targetX, 2), 0.04);
      p.y = lerp(p.y, addJitter(targetY, 2), 0.04);

      return p;
    });
  }, []);

  // Main animation loop
  useEffect(() => {
    if (!isSimulating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTickRef.current = performance.now();
    microEventTimerRef.current = 0;

    const tick = (timestamp: number) => {
      const delta = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;
      microEventTimerRef.current += delta;

      setState(prev => {
        let next = { ...prev };

        // Smooth ball interpolation
        currentBallRef.current.x = lerp(currentBallRef.current.x, targetBallRef.current.x, 0.12);
        currentBallRef.current.y = lerp(currentBallRef.current.y, targetBallRef.current.y, 0.12);
        next.ballX = currentBallRef.current.x;
        next.ballY = currentBallRef.current.y;

        // Ball trail
        const now = Date.now();
        next.ballTrail = [
          ...prev.ballTrail.filter(t => now - t.timestamp < 500),
          { x: next.ballX, y: next.ballY, timestamp: now },
        ].slice(-12);

        // Shift player formations
        next.players = shiftFormations([...prev.players.map(p => ({ ...p }))], prev.possession, phaseRef.current);

        // Clean old passing lines
        next.passingLines = prev.passingLines.filter(l => now - l.timestamp < 800);

        // Generate micro-event every 1.2-2.5 seconds
        // When livePhase is provided, use it to bias the simulation instead of random events
        if (microEventTimerRef.current > 1200 + Math.random() * 1300) {
          microEventTimerRef.current = 0;
          if (livePhase && livePhase !== 'safe') {
            // Override phase from real API data
            const mappedPhase = livePhase === 'dangerous_attack' ? 'attack' : livePhase === 'setpiece' ? 'setpiece' : 'attack';
            phaseRef.current = mappedPhase;
            // Bias possession toward attacking team
            if (liveAttackingTeam) {
              next.possession = liveAttackingTeam;
            }
          } else if (livePhase === 'safe') {
            phaseRef.current = 'buildup';
          }
          next = generateMicroEvent(next);
        }

        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, shiftFormations, generateMicroEvent]);

  // Handle goal events from parent simulation
  useEffect(() => {
    if (currentEvent?.type === 'goal') {
      const goalX = currentEvent.team === 'home' ? 96 : 4;
      targetBallRef.current = { x: goalX, y: 50 };

      setState(prev => ({
        ...prev,
        isGoalCelebration: true,
        goalTeam: currentEvent.team,
      }));

      // Reset after celebration
      setTimeout(() => {
        targetBallRef.current = { x: 50, y: 50 };
        setState(prev => ({
          ...prev,
          isGoalCelebration: false,
          goalTeam: null,
        }));
      }, 3000);
    }
  }, [currentEvent]);

  // Sync with parent ball position on major events
  useEffect(() => {
    if (ballPosition && currentEvent) {
      targetBallRef.current = { x: ballPosition.x, y: ballPosition.y };
    }
  }, [ballPosition, currentEvent]);

  return state;
};
