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
      draw: 3.2,
      awayWin: 2.8,
      updated: "2024-01-15T19:45:00Z",
    },
    statistics: {
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
    },
    commentary: [
      { minute: 78, text: "GOAL! Vinicius Jr. scores a brilliant goal to put Real Madrid ahead!" },
      { minute: 75, text: "Barcelona pressing for an equalizer, creating several chances." },
      { minute: 67, text: "GOAL! Lewandowski equalizes for Barcelona with a clinical finish!" },
      { minute: 45, text: "Yellow card shown to Pedri for a tactical foul." },
      { minute: 23, text: "GOAL! Benzema opens the scoring for Real Madrid!" },
    ],
  };
};