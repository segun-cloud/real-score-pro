import { Match } from "@/types/sports";
import { FootballTracker } from "./trackers/FootballTracker";
import { BasketballTracker } from "./trackers/BasketballTracker";
import { TennisTracker } from "./trackers/TennisTracker";
import { BaseballTracker } from "./trackers/BaseballTracker";
import { BoxingTracker } from "./trackers/BoxingTracker";

interface SportTrackerProps {
  match: Match;
  isSimulating?: boolean;
  ballPosition?: { x: number; y: number };
  currentEvent?: {
    type: 'goal' | 'basket' | 'point' | 'run' | 'punch';
    team: 'home' | 'away';
    minute?: number;
  } | null;
  // FIX: added livePhase and liveAttackingTeam so phase data flows down to FootballTracker
  livePhase?: 'safe' | 'attack' | 'dangerous_attack' | 'setpiece' | 'goal';
  liveAttackingTeam?: 'home' | 'away' | null;
}

export const SportTracker = ({
  match,
  isSimulating,
  ballPosition,
  currentEvent,
  livePhase,
  liveAttackingTeam,
}: SportTrackerProps) => {
  // FIX: default scores to 0 — homeScore/awayScore are number | undefined on Match type
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  // Shared base props used by all trackers
  const baseProps = {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    minute: match.minute,
    homeScore,
    awayScore,
    isSimulating,
    currentEvent,
  };

  switch (match.sport) {
    case 'football':
      return (
        <FootballTracker
          {...baseProps}
          ballPosition={ballPosition}
          // FIX: livePhase and liveAttackingTeam now passed through to FootballTracker
          livePhase={livePhase}
          liveAttackingTeam={liveAttackingTeam}
        />
      );

    case 'basketball':
      return (
        <BasketballTracker
          {...baseProps}
          ballPosition={ballPosition}
        />
      );

    case 'tennis':
      return (
        <TennisTracker
          {...baseProps}
          ballPosition={ballPosition}
        />
      );

    case 'baseball':
      return (
        <BaseballTracker
          {...baseProps}
          ballPosition={ballPosition}
        />
      );

    case 'boxing':
      // Boxing has no ball position — intentionally omitted
      return (
        <BoxingTracker
          {...baseProps}
        />
      );

    default:
      // FIX: explicit warning instead of silently rendering wrong tracker
      // If a new sport is added and this fires, it's immediately obvious in dev
      if (process.env.NODE_ENV === 'development') {
        console.warn(`SportTracker: unhandled sport "${match.sport}" — returning null`);
      }
      return null;
  }
};
