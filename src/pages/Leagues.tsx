import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPORT_CONFIG, type SportType, type Match as DBMatch } from "@/types/funhub";
import { Trophy, MapPin, Loader2 } from "lucide-react";

interface League {
  id: string;
  country: string;
  name: string;
  tier: number;
  sport: SportType;
  logo_url: string | null;
  api_league_id: string | null;
  api_provider: string | null;
}

interface LeaguesByCountry {
  [country: string]: League[];
}

const COUNTRY_FLAGS: { [key: string]: string } = {
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain': '🇪🇸',
  'Germany': '🇩🇪',
  'Italy': '🇮🇹',
  'France': '🇫🇷',
  'USA': '🇺🇸',
  'Europe': '🇪🇺',
  'International': '🌍',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
};

export const Leagues = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType>('football');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagueMatches, setLeagueMatches] = useState<DBMatch[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [loadingLeagueData, setLoadingLeagueData] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, [selectedSport]);

  const loadLeagues = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('sport', selectedSport)
        .order('country', { ascending: true })
        .order('tier', { ascending: true });

      if (error) throw error;
      if (data) setLeagues(data);
    } catch (error) {
      console.error('Error loading leagues:', error);
      toast.error('Failed to load leagues');
    } finally {
      setIsLoading(false);
    }
  };

  // Group leagues by country
  const leaguesByCountry: LeaguesByCountry = leagues.reduce((acc, league) => {
    if (!acc[league.country]) {
      acc[league.country] = [];
    }
    acc[league.country].push(league);
    return acc;
  }, {} as LeaguesByCountry);

  const handleLeagueClick = async (league: League) => {
    setSelectedLeague(league);
    setLoadingLeagueData(true);
    
    try {
      // Only fetch API-Sports data if we have an api_league_id
      if (league.api_league_id) {
        // API-Sports free plan supports 2022-2024 seasons
        const currentYear = Math.min(new Date().getFullYear() - 1, 2024);
        
        // Fetch standings, fixtures, and top scorers in parallel
        const [standingsRes, fixturesRes, scorersRes] = await Promise.all([
          supabase.functions.invoke('fetch-league-standings', {
            body: { leagueId: league.api_league_id, season: currentYear }
          }),
          supabase.functions.invoke('fetch-league-fixtures', {
            body: { leagueId: league.api_league_id, season: currentYear, last: 10 }
          }),
          supabase.functions.invoke('fetch-league-top-scorers', {
            body: { leagueId: league.api_league_id, season: currentYear }
          })
        ]);

        if (standingsRes.data?.standings) {
          setStandings(standingsRes.data.standings);
        }
        if (fixturesRes.data?.fixtures) {
          setFixtures(fixturesRes.data.fixtures);
        }
        if (scorersRes.data?.topScorers) {
          setTopScorers(scorersRes.data.topScorers);
        }
      } else {
        // Show message that API data is not available for this league
        toast.info('Detailed stats not available for this league yet');
      }
    } catch (error) {
      console.error('Error loading league data:', error);
      toast.error('Failed to load league details');
    } finally {
      setLoadingLeagueData(false);
    }
  };

  if (selectedLeague) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b p-4 sticky top-0 z-10">
          <button 
            onClick={() => setSelectedLeague(null)}
            className="text-primary hover:underline mb-2"
          >
            ← Back to Leagues
          </button>
          <div className="flex items-center gap-3">
            {selectedLeague.logo_url ? (
              <img src={selectedLeague.logo_url} alt="" className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-2xl">{COUNTRY_FLAGS[selectedLeague.country]}</span>
            )}
            <h1 className="text-xl font-bold">{selectedLeague.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedLeague.country} • {selectedLeague.sport}
          </p>
        </div>

        <div className="p-4 space-y-4">
          {loadingLeagueData ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="standings" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="standings">Standings</TabsTrigger>
                <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
                <TabsTrigger value="scorers">Top Scorers</TabsTrigger>
              </TabsList>

              <TabsContent value="standings" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>League Table</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {standings.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-2">No standings data available</p>
                        <p className="text-xs text-muted-foreground">
                          This may be a limitation of the free API plan
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead className="text-center">P</TableHead>
                              <TableHead className="text-center">W</TableHead>
                              <TableHead className="text-center">D</TableHead>
                              <TableHead className="text-center">L</TableHead>
                              <TableHead className="text-center">Pts</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {standings.map((team: any, index: number) => (
                              <TableRow key={team.position || team.rank || index}>
                                <TableCell className="font-medium">{team.position || team.rank || index + 1}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                  {(team.team_logo || team.team?.logo) ? (
                                    <img src={team.team_logo || team.team?.logo} alt="" className="w-5 h-5 object-contain" />
                                  ) : (
                                    <div className="w-5 h-5 bg-muted rounded-full" />
                                  )}
                                  <span className="text-sm truncate">{team.team_name || team.team?.name || 'Unknown'}</span>
                                </TableCell>
                                <TableCell className="text-center">{team.played ?? team.all?.played ?? 0}</TableCell>
                                <TableCell className="text-center">{team.won ?? team.all?.win ?? 0}</TableCell>
                                <TableCell className="text-center">{team.drawn ?? team.all?.draw ?? 0}</TableCell>
                                <TableCell className="text-center">{team.lost ?? team.all?.lose ?? 0}</TableCell>
                                <TableCell className="text-center font-bold">{team.points ?? 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Fixtures</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fixtures.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-2">No fixtures data available</p>
                        <p className="text-xs text-muted-foreground">
                          This may be a limitation of the free API plan
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {fixtures.map((fixture: any) => (
                          <div key={fixture.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(fixture.startTime).toLocaleDateString()}
                              </span>
                              <Badge 
                                variant={
                                  fixture.status === 'live' ? 'destructive' : 
                                  fixture.status === 'finished' ? 'secondary' : 
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {fixture.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <img src={fixture.homeTeamLogo} alt="" className="w-6 h-6" />
                                <span className="text-sm font-medium">{fixture.homeTeam}</span>
                              </div>
                              <div className="flex items-center gap-3 px-4">
                                <span className="text-lg font-bold">
                                  {fixture.homeScore ?? '-'}
                                </span>
                                <span className="text-muted-foreground">:</span>
                                <span className="text-lg font-bold">
                                  {fixture.awayScore ?? '-'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-sm font-medium">{fixture.awayTeam}</span>
                                <img src={fixture.awayTeamLogo} alt="" className="w-6 h-6" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scorers" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Scorers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topScorers.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-2">No top scorers data available</p>
                        <p className="text-xs text-muted-foreground">
                          This may be a limitation of the free API plan
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topScorers.map((player: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-2 border rounded-lg">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                              {index + 1}
                            </div>
                            <img src={player.photo} alt="" className="w-10 h-10 rounded-full" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">{player.team}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{player.goals}</p>
                              <p className="text-xs text-muted-foreground">goals</p>
                            </div>
                            {player.assists > 0 && (
                              <div className="text-right">
                                <p className="font-medium">{player.assists}</p>
                                <p className="text-xs text-muted-foreground">assists</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-3">Leagues</h1>
        
        {/* Sport Filter */}
        <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sport" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SPORT_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.icon} {config.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading leagues...</p>
          </div>
        ) : Object.keys(leaguesByCountry).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No leagues found for this sport</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(leaguesByCountry)} className="space-y-3">
            {Object.entries(leaguesByCountry).map(([country, countryLeagues]) => (
              <AccordionItem key={country} value={country} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{COUNTRY_FLAGS[country] || '🌍'}</span>
                    <div className="text-left">
                      <h3 className="font-bold">{country}</h3>
                      <p className="text-xs text-muted-foreground">
                        {countryLeagues.length} {countryLeagues.length === 1 ? 'league' : 'leagues'}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2 mt-2">
                    {countryLeagues.map((league) => (
                      <Card 
                        key={league.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleLeagueClick(league)}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {league.logo_url ? (
                              <img src={league.logo_url} alt="" className="w-8 h-8 object-contain" />
                            ) : (
                              <span className="text-2xl">{SPORT_CONFIG[league.sport].icon}</span>
                            )}
                            <h4 className="font-medium">{league.name}</h4>
                          </div>
                          <Badge variant="outline">View</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};