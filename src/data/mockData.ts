import { Match, MatchDetails, UserProfile } from "@/types/sports";

// Generate dynamic dates for realistic testing
const now = new Date();
const today = new Date(now);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);

// Helper to create time strings
const getTimeString = (date: Date, hoursOffset: number = 0): string => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hoursOffset);
  return newDate.toISOString();
};

export const mockMatches: Match[] = [
  // FOOTBALL MATCHES
  {
    id: "1",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeScore: 2,
    awayScore: 1,
    status: "live",
    startTime: getTimeString(today, -1), // Started 1 hour ago
    sport: "football",
    league: "La Liga",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 67,
  },
  {
    id: "2",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    startTime: getTimeString(today, 3), // In 3 hours
    sport: "football",
    league: "Premier League",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "3",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    homeScore: 1,
    awayScore: 3,
    status: "finished",
    startTime: getTimeString(yesterday, 15),
    sport: "football",
    league: "Premier League",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "4",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    homeScore: 3,
    awayScore: 2,
    status: "live",
    startTime: getTimeString(today, -0.5), // Started 30 mins ago
    sport: "football",
    league: "Bundesliga",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 38,
  },
  {
    id: "5",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    startTime: getTimeString(tomorrow, 18),
    sport: "football",
    league: "Ligue 1",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  
  // BASKETBALL MATCHES
  {
    id: "6",
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    homeScore: 112,
    awayScore: 108,
    status: "finished",
    startTime: getTimeString(yesterday, 20),
    sport: "basketball",
    league: "NBA",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "7",
    homeTeam: "Celtics",
    awayTeam: "Heat",
    homeScore: 95,
    awayScore: 89,
    status: "live",
    startTime: getTimeString(today, -1.5), // Started 1.5 hours ago
    sport: "basketball",
    league: "NBA",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 42,
  },
  {
    id: "8",
    homeTeam: "Bucks",
    awayTeam: "76ers",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    startTime: getTimeString(today, 4),
    sport: "basketball",
    league: "NBA",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "9",
    homeTeam: "Nets",
    awayTeam: "Knicks",
    homeScore: 103,
    awayScore: 98,
    status: "live",
    startTime: getTimeString(today, -2),
    sport: "basketball",
    league: "NBA",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 56,
  },
  
  // TENNIS MATCHES
  {
    id: "10",
    homeTeam: "Novak Djokovic",
    awayTeam: "Rafael Nadal",
    homeScore: 6,
    awayScore: 4,
    status: "live",
    startTime: getTimeString(today, -2), // Started 2 hours ago
    sport: "tennis",
    league: "Australian Open",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 95,
  },
  {
    id: "11",
    homeTeam: "Carlos Alcaraz",
    awayTeam: "Daniil Medvedev",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    startTime: getTimeString(today, 5),
    sport: "tennis",
    league: "Australian Open",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "12",
    homeTeam: "Iga Swiatek",
    awayTeam: "Coco Gauff",
    homeScore: 6,
    awayScore: 3,
    status: "finished",
    startTime: getTimeString(yesterday, 10),
    sport: "tennis",
    league: "Australian Open",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  
  // BASEBALL MATCHES
  {
    id: "13",
    homeTeam: "Yankees",
    awayTeam: "Red Sox",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    startTime: getTimeString(today, 19),
    sport: "baseball",
    league: "MLB",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "14",
    homeTeam: "Dodgers",
    awayTeam: "Giants",
    homeScore: 5,
    awayScore: 3,
    status: "finished",
    startTime: getTimeString(yesterday, 22),
    sport: "baseball",
    league: "MLB",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "15",
    homeTeam: "Astros",
    awayTeam: "Rangers",
    homeScore: 2,
    awayScore: 1,
    status: "live",
    startTime: getTimeString(today, -1),
    sport: "baseball",
    league: "MLB",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 6, // Inning
  },
  
  // BOXING MATCHES
  {
    id: "16",
    homeTeam: "Tyson Fury",
    awayTeam: "Deontay Wilder",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    startTime: getTimeString(tomorrow, 22),
    sport: "boxing",
    league: "WBC Heavyweight",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "17",
    homeTeam: "Canelo Alvarez",
    awayTeam: "Gennady Golovkin",
    homeScore: 10,
    awayScore: 9,
    status: "finished",
    startTime: getTimeString(yesterday, 23),
    sport: "boxing",
    league: "WBC Middleweight",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
  },
  {
    id: "18",
    homeTeam: "Anthony Joshua",
    awayTeam: "Oleksandr Usyk",
    homeScore: 0,
    awayScore: 0,
    status: "live",
    startTime: getTimeString(today, -0.3),
    sport: "boxing",
    league: "WBA Heavyweight",
    homeTeamLogo: "/placeholder.svg",
    awayTeamLogo: "/placeholder.svg",
    minute: 8, // Round
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

  // Generate events based on sport
  const getEventsBySport = () => {
    if (match.sport === 'football') {
      return [
        { minute: 12, type: "goal" as const, player: "Forward", team: "home" as const, description: `Goal by ${match.homeTeam}` },
        { minute: 28, type: "yellow_card" as const, player: "Defender", team: "away" as const, description: `Yellow card for ${match.awayTeam}` },
        { minute: 45, type: "goal" as const, player: "Midfielder", team: "home" as const, description: `Goal by ${match.homeTeam}` },
        { minute: 67, type: "goal" as const, player: "Striker", team: "away" as const, description: `Goal by ${match.awayTeam}` },
        { minute: 82, type: "substitution" as const, player: "Winger", team: "home" as const, description: "Substitution" },
      ];
    } else if (match.sport === 'basketball') {
      return [
        { minute: 8, type: "goal" as const, player: "Guard", team: "home" as const, description: "3-pointer" },
        { minute: 15, type: "goal" as const, player: "Forward", team: "away" as const, description: "Dunk" },
        { minute: 22, type: "goal" as const, player: "Center", team: "home" as const, description: "Layup" },
      ];
    }
    return [];
  };

  return {
    ...match,
    events: getEventsBySport(),
    odds: {
      homeWin: 2.1,
      draw: match.sport === 'tennis' || match.sport === 'baseball' || match.sport === 'boxing' ? undefined : 3.2,
      awayWin: 2.8,
      updated: "2024-01-15T19:45:00Z",
    },
    h2h: {
      homeWins: 15,
      draws: 8,
      awayWins: 12,
      recentMeetings: [
        { date: '2024-10-15', homeScore: 2, awayScore: 1, competition: match.league },
        { date: '2024-08-22', homeScore: 1, awayScore: 1, competition: match.league },
        { date: '2024-05-10', homeScore: 0, awayScore: 2, competition: match.league },
        { date: '2024-02-18', homeScore: 3, awayScore: 2, competition: match.league },
        { date: '2023-11-25', homeScore: 1, awayScore: 0, competition: match.league },
      ],
    },
    standings: [
      { position: 1, team: "Liverpool", teamLogo: "/placeholder.svg", played: 15, won: 12, drawn: 2, lost: 1, goalsFor: 38, goalsAgainst: 12, goalDifference: 26, points: 38 },
      { position: 2, team: match.homeTeam, teamLogo: match.homeTeamLogo, played: 15, won: 10, drawn: 3, lost: 2, goalsFor: 32, goalsAgainst: 15, goalDifference: 17, points: 33 },
      { position: 3, team: "Arsenal", teamLogo: "/placeholder.svg", played: 15, won: 9, drawn: 4, lost: 2, goalsFor: 28, goalsAgainst: 14, goalDifference: 14, points: 31 },
      { position: 4, team: match.awayTeam, teamLogo: match.awayTeamLogo, played: 15, won: 8, drawn: 5, lost: 2, goalsFor: 30, goalsAgainst: 18, goalDifference: 12, points: 29 },
      { position: 5, team: "Chelsea", teamLogo: "/placeholder.svg", played: 15, won: 7, drawn: 5, lost: 3, goalsFor: 25, goalsAgainst: 20, goalDifference: 5, points: 26 },
      { position: 6, team: "Tottenham", teamLogo: "/placeholder.svg", played: 15, won: 6, drawn: 4, lost: 5, goalsFor: 22, goalsAgainst: 22, goalDifference: 0, points: 22 },
    ],
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
      { minute: 82, text: "Substitution made, fresh legs brought on for the final push." },
      { minute: 67, text: `GOAL! ${match.awayTeam} pulls one back!` },
      { minute: 45, text: `GOAL! ${match.homeTeam} doubles their lead before halftime!` },
      { minute: 28, text: "Yellow card shown for a tactical foul." },
      { minute: 12, text: `GOAL! ${match.homeTeam} opens the scoring!` },
    ],
    media: {
      highlights: [
        "https://example.com/highlight1.mp4",
        "https://example.com/highlight2.mp4",
      ],
      photos: [
        "/placeholder.svg",
        "/placeholder.svg",
        "/placeholder.svg",
        "/placeholder.svg",
      ],
    },
  };
};