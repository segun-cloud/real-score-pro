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
  currentEvent?: { type: string; team: 'home' | 'away' };
}

export const SportTracker = ({ match, isSimulating, ballPosition, currentEvent }: SportTrackerProps) => {
  switch (match.sport) {
    case 'football':
      return (
        <FootballTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          isSimulating={isSimulating}
          ballPosition={ballPosition}
          currentEvent={currentEvent}
        />
      );
    case 'basketball':
      return (
        <BasketballTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          isSimulating={isSimulating}
          ballPosition={ballPosition}
          currentEvent={currentEvent}
        />
      );
    case 'tennis':
      return (
        <TennisTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          isSimulating={isSimulating}
          ballPosition={ballPosition}
          currentEvent={currentEvent}
        />
      );
    case 'baseball':
      return (
        <BaseballTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          isSimulating={isSimulating}
          ballPosition={ballPosition}
          currentEvent={currentEvent}
        />
      );
    case 'boxing':
      return (
        <BoxingTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          isSimulating={isSimulating}
          currentEvent={currentEvent}
        />
      );
    default:
      return (
        <FootballTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          isSimulating={isSimulating}
          ballPosition={ballPosition}
          currentEvent={currentEvent}
        />
      );
  }
};