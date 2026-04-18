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

export interface UserProfile {
  id: string;
  username: string;
  coins: number;
  // FIX: added is_premium — referenced in MatchDetails as userProfile.isPremium
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTeam {
  id: string;
  user_id: string;
  sport: SportType;
  team_name: string;
  emblem_id: number | null;
  kit_id: number | null;
  division: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
}

export interface TeamPlayer {
  id: string;
  team_id: string;
  player_name: string;
  position: string;
  jersey_number: number;
  // All rating stats are 0–100 scale
  overall_rating: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  training_level: number;
  created_at: string;
}

export interface TeamEmblem {
  id: number;
  name: string;
  svg_path: string;
  unlock_cost: number;
}

export interface TeamKit {
  id: number;
  sport: SportType;
  name: string;
  primary_color: string;
  secondary_color: string;
  pattern: string;
  unlock_cost: number;
}

export interface Competition {
  id: string;
  sport: SportType;
  division: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  prize_coins: number;
  entry_fee: number;
  created_at: string;
  season_id: string | null;
  max_participants: number | null;
  match_generation_status: string | null;
  registration_deadline: string | null;
  min_participants: number;
  format: 'single_round_robin' | 'double_round_robin';
}

export interface CompetitionParticipant {
  id: string;
  competition_id: string;
  team_id: string;
  final_position: number | null;
  points_earned: number;
  // FIX: added joined_at — useful for sorting participants and auditing join order
  joined_at: string;
}

// FIX: renamed from Match to FunHubMatch to avoid collision with Match in src/types/sports.ts
// The sports Match uses camelCase (homeTeam, awayTeam) and live/finished/scheduled statuses.
// This type uses snake_case DB field names and is specific to FunHub competitions.
export interface FunHubMatch {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'completed';
  match_date: string;
  match_day?: number;
  created_at: string;
}

export const SPORT_CONFIG: Record<SportType, {
  name: string;
  icon: string;
  playerCount: number;
  positions: string[];
  kitItems: string[];
}> = {
  football: {
    name: 'Football',
    icon: '⚽',
    playerCount: 11,
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    kitItems: ['Jersey', 'Shorts', 'Socks'],
  },
  basketball: {
    name: 'Basketball',
    icon: '🏀',
    playerCount: 5,
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    kitItems: ['Jersey', 'Shorts'],
  },
  tennis: {
    name: 'Tennis',
    icon: '🎾',
    playerCount: 1,
    positions: ['Player'],
    kitItems: ['Shirt', 'Shorts'],
  },
  baseball: {
    name: 'Baseball',
    icon: '⚾',
    playerCount: 9,
    positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
    kitItems: ['Jersey', 'Pants', 'Cap'],
  },
  boxing: {
    name: 'Boxing',
    icon: '🥊',
    playerCount: 1,
    positions: ['Fighter'],
    kitItems: ['Shorts', 'Gloves'],
  },
  cricket: {
    name: 'Cricket',
    icon: '🏏',
    playerCount: 11,
    positions: ['BAT', 'BAT', 'BAT', 'BAT', 'BAT', 'BAT', 'BWL', 'BWL', 'BWL', 'BWL', 'WK'],
    kitItems: ['Jersey', 'Pants'],
  },
  'ice-hockey': {
    name: 'Ice Hockey',
    icon: '🏒',
    playerCount: 6,
    positions: ['G', 'LD', 'RD', 'LW', 'C', 'RW'],
    kitItems: ['Jersey', 'Pants', 'Helmet'],
  },
  rugby: {
    name: 'Rugby',
    icon: '🏉',
    playerCount: 15,
    positions: ['PR', 'HK', 'PR', 'LK', 'LK', 'FL', 'FL', 'N8', 'SH', 'FH', 'LW', 'IC', 'OC', 'RW', 'FB'],
    kitItems: ['Jersey', 'Shorts'],
  },
  'american-football': {
    name: 'American Football',
    icon: '🏈',
    playerCount: 11,
    positions: ['QB', 'RB', 'WR', 'WR', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'],
    kitItems: ['Jersey', 'Pants', 'Helmet'],
  },
};

// FIX: explicit type annotation — maxPlayers: null means unlimited, not missing data
export const DIVISION_CONFIG: Array<{
  level: number;
  name: string;
  entryFee: number;
  prize: number;
  maxPlayers: number | null; // null = unlimited
}> = [
  { level: 5, name: 'Div 5', entryFee: 50,   prize: 200,  maxPlayers: null }, // unlimited
  { level: 4, name: 'Div 4', entryFee: 100,  prize: 500,  maxPlayers: 20 },
  { level: 3, name: 'Div 3', entryFee: 200,  prize: 1000, maxPlayers: 20 },
  { level: 2, name: 'Div 2', entryFee: 500,  prize: 2500, maxPlayers: 20 },
  { level: 1, name: 'Div 1', entryFee: 1000, prize: 5000, maxPlayers: 20 },
];
