import { Match } from "@/types/sports";
import { FootballTracker } from "./trackers/FootballTracker";
import { BasketballTracker } from "./trackers/BasketballTracker";
import { TennisTracker } from "./trackers/TennisTracker";
import { BaseballTracker } from "./trackers/BaseballTracker";
import { BoxingTracker } from "./trackers/BoxingTracker";

interface SportTrackerProps {
  match: Match;
}

export const SportTracker = ({ match }: SportTrackerProps) => {
  switch (match.sport) {
    case 'football':
      return (
        <FootballTracker
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          minute={match.minute}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
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
        />
      );
  }
};