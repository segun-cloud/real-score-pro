// FIX: import SportType from funhub-types instead of duplicating the union here
// If you prefer to keep this file standalone, keep the SportType definition below
// but remove it from funhub-types.ts to avoid the two getting out of sync.
export type SportType =
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'baseball'
  | 'boxing'
  | 'cricket'
  | 'ice-hockey'
  | 'rugby'
  | 'american-football';

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished';
  startTime: string;
  sport: SportType;
  league: string;
  minute?: number;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

export interface H2HRecord {
  homeWins: number;
  draws: number;
  awayWins: number;
  recentMeetings: {
    date: string;
    homeScore: number;
    awayScore: number;
    competition?: string;
  }[];
}

export interface LeagueStanding {
  position: number;
  team: string;
  teamLogo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchMedia {
  highlights?: string[];
  photos?: string[];
}

export interface MatchDetails extends Match {
  events: MatchEvent[];
  // FIX: odds made optional — MatchDetails.tsx initialises it as a default empty
  // object when real odds aren't available, so non-optional caused type errors
  odds?: Odds;
  lineups?: Lineups;
  statistics: Statistics;
  commentary: Commentary[];
  h2h?: H2HRecord;
  standings?: LeagueStanding[];
  media?: MatchMedia;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'corner' | 'halftime';
  // FIX: player made optional — not all event types have a named player (e.g. halftime)
  player?: string;
  team: 'home' | 'away';
  description?: string;
  // FIX: added missing fields used in LiveMatchTracker
  assistedBy?: string;
  playerIn?: string;  // for substitution events
  playerOut?: string; // for substitution events
  score?: { home: number; away: number }; // snapshot score at time of event
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
  // ── Football ────────────────────────────────────────────────────────────────
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
  // FIX: added yellowCards and redCards — used in LiveMatchTracker stats grid
  // and returned by fetch-match-details-apisports but missing from this type
  yellowCards?: { home: number; away: number };
  redCards?: { home: number; away: number };

  // ── Basketball ───────────────────────────────────────────────────────────────
  fieldGoalPercentage?: { home: number; away: number };
  threePointPercentage?: { home: number; away: number };
  freeThrowPercentage?: { home: number; away: number };
  rebounds?: { home: number; away: number };
  assists?: { home: number; away: number };
  steals?: { home: number; away: number };
  blocks?: { home: number; away: number };
  turnovers?: { home: number; away: number };

  // ── Tennis ───────────────────────────────────────────────────────────────────
  aces?: { home: number; away: number };
  doubleFaults?: { home: number; away: number };
  firstServePercentage?: { home: number; away: number };
  breakPointsWon?: { home: number; away: number };
  winners?: { home: number; away: number };
  unforcedErrors?: { home: number; away: number };

  // ── Baseball ─────────────────────────────────────────────────────────────────
  hits?: { home: number; away: number };
  runs?: { home: number; away: number };
  errors?: { home: number; away: number };
  battingAverage?: { home: number; away: number };
  strikeouts?: { home: number; away: number };
  walks?: { home: number; away: number };
  homeRuns?: { home: number; away: number };

  // ── Boxing ───────────────────────────────────────────────────────────────────
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

// FIX: UserProfile aligned with actual Supabase DB column name (is_premium snake_case)
// and added premiumExpiry for consistency. The component should map is_premium → isPremium
// when reading from DB, or use is_premium directly throughout.
export interface UserProfile {
  id: string;
  coins: number;
  isPremium: boolean;   // maps from DB column: is_premium
  premiumExpiry?: string;
}
