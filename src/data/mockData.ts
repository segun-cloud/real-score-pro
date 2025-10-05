import { Match, MatchDetails, UserProfile } from "@/types/sports";

export const mockMatches: Match[] = [
  {
    id: "1",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeScore: 2,
    awayScore: 1,
    status: "live",
    startTime: "2024-01-15T20:00:00Z",
    sport: "football",
    league: "La Liga",
    minute: 78,
  },
  {
    id: "2",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    status: "scheduled",
    startTime: "2024-01-16T15:30:00Z",
    sport: "football",
    league: "Premier League",
  },
  {
    id: "3",
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    homeScore: 112,
    awayScore: 108,
    status: "finished",
    startTime: "2024-01-15T02:00:00Z",
    sport: "basketball",
    league: "NBA",
  },
  {
    id: "4",
    homeTeam: "Novak Djokovic",
    awayTeam: "Rafael Nadal",
    homeScore: 6,
    awayScore: 4,
    status: "live",
    startTime: "2024-01-15T14:00:00Z",
    sport: "tennis",
    league: "Australian Open",
    minute: 45,
  },
  {
    id: "5",
    homeTeam: "Yankees",
    awayTeam: "Red Sox",
    status: "scheduled",
    startTime: "2024-01-16T19:00:00Z",
    sport: "baseball",
    league: "MLB",
  },
  {
    id: "6",
    homeTeam: "Tyson Fury",
    awayTeam: "Deontay Wilder",
    status: "scheduled",
    startTime: "2024-01-20T22:00:00Z",
    sport: "boxing",
    league: "WBC Heavyweight",
  },
  {
    id: "7",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    homeScore: 1,
    awayScore: 3,
    status: "finished",
    startTime: "2024-01-14T17:30:00Z",
    sport: "football",
    league: "Premier League",
  },
  {
    id: "8",
    homeTeam: "Celtics",
    awayTeam: "Heat",
    homeScore: 95,
    awayScore: 89,
    status: "live",
    startTime: "2024-01-15T01:00:00Z",
    sport: "basketball",
    league: "NBA",
    minute: 42,
  },
];

export const mockUserProfile: UserProfile = {
  id: "user1",
  coins: 150,
  isPremium: false,
};

export const getMockMatchDetails = (matchId: string): MatchDetails => {
  const match = mockMatches.find(m => m.id === matchId);
  if (!match) throw new Error("Match not found");

  // Sport-specific statistics
  const getStatisticsBySport = () => {
    switch (match.sport) {
      case 'basketball':
        return {
          fieldGoalPercentage: { home: 48, away: 52 },
          threePointPercentage: { home: 38, away: 42 },
          freeThrowPercentage: { home: 82, away: 78 },
          rebounds: { home: 42, away: 38 },
          assists: { home: 24, away: 28 },
          steals: { home: 8, away: 6 },
          blocks: { home: 5, away: 7 },
          turnovers: { home: 12, away: 15 },
          fouls: { home: 18, away: 21 },
        };
      case 'tennis':
        return {
          aces: { home: 12, away: 8 },
          doubleFaults: { home: 3, away: 5 },
          firstServePercentage: { home: 68, away: 62 },
          breakPointsWon: { home: 4, away: 2 },
          winners: { home: 32, away: 28 },
          unforcedErrors: { home: 18, away: 24 },
        };
      case 'baseball':
        return {
          hits: { home: 9, away: 7 },
          runs: { home: 5, away: 3 },
          errors: { home: 1, away: 2 },
          homeRuns: { home: 2, away: 1 },
          strikeouts: { home: 8, away: 10 },
          walks: { home: 4, away: 3 },
        };
      case 'boxing':
        return {
          punchesThrown: { home: 487, away: 523 },
          punchesLanded: { home: 178, away: 192 },
          punchAccuracy: { home: 37, away: 37 },
          powerPunches: { home: 89, away: 102 },
          jabs: { home: 89, away: 90 },
          knockdowns: { home: 0, away: 1 },
        };
      default: // football
        return {
          possession: { home: 52, away: 48 },
          shots: { home: 14, away: 11 },
          shotsOnTarget: { home: 6, away: 4 },
          corners: { home: 7, away: 5 },
          fouls: { home: 12, away: 15 },
          freeKicks: { home: 8, away: 11 },
          penalties: { home: 1, away: 0 },
          passes: { home: 487, away: 423 },
          attacks: { home: 56, away: 48 },
          dangerousAttacks: { home: 32, away: 28 },
          bigChances: { home: 4, away: 3 },
        };
    }
  };

  return {
    ...match,
    events: [
      { minute: 23, type: "goal", player: "Benzema", team: "home", description: "Goal by Benzema" },
      { minute: 45, type: "yellow_card", player: "Pedri", team: "away", description: "Yellow card for Pedri" },
      { minute: 67, type: "goal", player: "Lewandowski", team: "away", description: "Goal by Lewandowski" },
      { minute: 78, type: "goal", player: "Vinicius Jr.", team: "home", description: "Goal by Vinicius Jr." },
    ],
    odds: {
      homeWin: 2.1,
      draw: match.sport === 'tennis' || match.sport === 'baseball' || match.sport === 'boxing' ? undefined : 3.2,
      awayWin: 2.8,
      updated: "2024-01-15T19:45:00Z",
    },
    lineups: match.sport === 'football' ? {
      home: [
        // Starting XI
        { name: "Courtois", position: "GK", number: 1, captain: false },
        { name: "Carvajal", position: "RB", number: 2, captain: true },
        { name: "Militão", position: "CB", number: 3, captain: false },
        { name: "Alaba", position: "CB", number: 4, captain: false },
        { name: "Mendy", position: "LB", number: 23, captain: false },
        { name: "Modrić", position: "CM", number: 10, captain: false },
        { name: "Camavinga", position: "CM", number: 12, captain: false },
        { name: "Valverde", position: "CM", number: 15, captain: false },
        { name: "Rodrygo", position: "RW", number: 21, captain: false },
        { name: "Benzema", position: "ST", number: 9, captain: false },
        { name: "Vinicius Jr.", position: "LW", number: 20, captain: false },
        // Substitutes
        { name: "Lunin", position: "GK", number: 13, isSubstitute: true },
        { name: "Nacho", position: "CB", number: 6, isSubstitute: true },
        { name: "Tchouaméni", position: "CM", number: 18, isSubstitute: true },
        { name: "Kroos", position: "CM", number: 8, isSubstitute: true },
        { name: "Asensio", position: "RW", number: 11, isSubstitute: true },
        { name: "Ceballos", position: "CM", number: 19, isSubstitute: true },
        { name: "Mariano", position: "ST", number: 7, isSubstitute: true },
      ],
      away: [
        // Starting XI
        { name: "ter Stegen", position: "GK", number: 1, captain: false },
        { name: "Koundé", position: "RB", number: 23, captain: false },
        { name: "Araújo", position: "CB", number: 4, captain: false },
        { name: "Christensen", position: "CB", number: 15, captain: false },
        { name: "Balde", position: "LB", number: 28, captain: false },
        { name: "de Jong", position: "CM", number: 21, captain: false },
        { name: "Busquets", position: "CDM", number: 5, captain: true },
        { name: "Pedri", position: "CM", number: 8, captain: false },
        { name: "Raphinha", position: "RW", number: 22, captain: false },
        { name: "Lewandowski", position: "ST", number: 9, captain: false },
        { name: "Gavi", position: "LW", number: 6, captain: false },
        // Substitutes
        { name: "Peña", position: "GK", number: 13, isSubstitute: true },
        { name: "Alba", position: "LB", number: 18, isSubstitute: true },
        { name: "Eric García", position: "CB", number: 24, isSubstitute: true },
        { name: "Kessié", position: "CM", number: 19, isSubstitute: true },
        { name: "Ferran Torres", position: "RW", number: 11, isSubstitute: true },
        { name: "Ansu Fati", position: "LW", number: 10, isSubstitute: true },
        { name: "Dembélé", position: "RW", number: 7, isSubstitute: true },
      ],
      homeFormation: "4-3-3",
      awayFormation: "4-3-3",
    } : undefined,
    statistics: getStatisticsBySport(),
    commentary: [
      { minute: 78, text: "GOAL! Vinicius Jr. scores a brilliant goal to put Real Madrid ahead!" },
      { minute: 75, text: "Barcelona pressing for an equalizer, creating several chances." },
      { minute: 67, text: "GOAL! Lewandowski equalizes for Barcelona with a clinical finish!" },
      { minute: 45, text: "Yellow card shown to Pedri for a tactical foul." },
      { minute: 23, text: "GOAL! Benzema opens the scoring for Real Madrid!" },
    ],
  };
};