export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished';
  startTime: string;
  sport: 'football' | 'basketball' | 'tennis' | 'baseball' | 'boxing' | 'cricket' | 'ice-hockey' | 'rugby' | 'american-football';
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
  homeFormation?: string;
  awayFormation?: string;
}

export interface Player {
  name: string;
  position: string;
  number: number;
  isSubstitute?: boolean;
  captain?: boolean;
}

export interface Statistics {
  // Football/Soccer
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  corners?: { home: number; away: number };
  fouls?: { home: number; away: number };
  freeKicks?: { home: number; away: number };
  penalties?: { home: number; away: number };
  passes?: { home: number; away: number };
  attacks?: { home: number; away: number };
  dangerousAttacks?: { home: number; away: number };
  bigChances?: { home: number; away: number };
  
  // Basketball
  fieldGoalPercentage?: { home: number; away: number };
  threePointPercentage?: { home: number; away: number };
  freeThrowPercentage?: { home: number; away: number };
  rebounds?: { home: number; away: number };
  assists?: { home: number; away: number };
  steals?: { home: number; away: number };
  blocks?: { home: number; away: number };
  turnovers?: { home: number; away: number };
  
  // Tennis
  aces?: { home: number; away: number };
  doubleFaults?: { home: number; away: number };
  firstServePercentage?: { home: number; away: number };
  breakPointsWon?: { home: number; away: number };
  winners?: { home: number; away: number };
  unforcedErrors?: { home: number; away: number };
  
  // Baseball
  hits?: { home: number; away: number };
  runs?: { home: number; away: number };
  errors?: { home: number; away: number };
  battingAverage?: { home: number; away: number };
  strikeouts?: { home: number; away: number };
  walks?: { home: number; away: number };
  homeRuns?: { home: number; away: number };
  
  // Boxing
  punchesThrown?: { home: number; away: number };
  punchesLanded?: { home: number; away: number };
  punchAccuracy?: { home: number; away: number };
  powerPunches?: { home: number; away: number };
  jabs?: { home: number; away: number };
  knockdowns?: { home: number; away: number };
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
