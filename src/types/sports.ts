export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished';
  startTime: string;
  sport: 'football' | 'basketball' | 'tennis' | 'baseball' | 'boxing';
  league: string;
  minute?: number;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

export interface MatchDetails extends Match {
  events: MatchEvent[];
  odds: Odds;
  lineups?: Lineups;
  statistics: Statistics;
  commentary: Commentary[];
  media?: string[];
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty';
  player: string;
  team: 'home' | 'away';
  description: string;
}

export interface Odds {
  homeWin: number;
  draw?: number;
  awayWin: number;
  updated: string;
}

export interface Lineups {
  home: Player[];
  away: Player[];
}

export interface Player {
  name: string;
  position: string;
  number: number;
}

export interface Statistics {
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  corners?: { home: number; away: number };
  fouls?: { home: number; away: number };
}

export interface Commentary {
  minute: number;
  text: string;
}

export interface UserProfile {
  id: string;
  coins: number;
  isPremium: boolean;
  premiumExpiry?: string;
}