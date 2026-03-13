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
      if (league.api_league_id) {
        const currentYear = Math.min(new Date().getFullYear() - 1, 2024);
        
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

        if (standingsRes.data?.standings) setStandings(standingsRes.data.standings);
        if (fixturesRes.data?.fixtures) setFixtures(fixturesRes.data.fixtures);
        if (scorersRes.data?.topScorers) setTopScorers(scorersRes.data.topScorers);
      } else {
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
        <div className="bg-card border-b p-3 sticky top-0 z-10">
          <button 
            onClick={() => setSelectedLeague(null)}
            className="text-primary hover:underline mb-1 text-sm"
          >
            ← Back to Leagues
          </button>
          <div className="flex items-center gap-2">
            {selectedLeague.logo_url ? (
              <img src={selectedLeague.logo_url} alt="" className="w-7 h-7 object-contain" />
            ) : (
              <span className="text-lg">{COUNTRY_FLAGS[selectedLeague.country]}</span>
            )}
            <h1 className="text-base font-bold">{selectedLeague.name}</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedLeague.country} • {selectedLeague.sport}
          </p>
        </div>

        <div className="p-3 space-y-3">
          {loadingLeagueData ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="standings" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="standings" className="text-xs">Standings</TabsTrigger>
                <TabsTrigger value="fixtures" className="text-xs">Fixtures</TabsTrigger>
                <TabsTrigger value="scorers" className="text-xs">Top Scorers</TabsTrigger>
              </TabsList>

              <TabsContent value="standings" className="mt-3">
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm">League Table</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-3">
                    {standings.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground text-sm mb-1">No standings data available</p>
                        <p className="text-[10px] text-muted-foreground">
                          This may be a limitation of the free API plan
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8 text-xs px-1">#</TableHead>
                              <TableHead className="text-xs px-1">Team</TableHead>
                              <TableHead className="text-center text-xs px-1">P</TableHead>
                              <TableHead className="text-center text-xs px-1">W</TableHead>
                              <TableHead className="text-center text-xs px-1">D</TableHead>
                              <TableHead className="text-center text-xs px-1">L</TableHead>
                              <TableHead className="text-center text-xs px-1">Pts</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {standings.map((team: any, index: number) => (
                              <TableRow key={team.position || team.rank || index}>
                                <TableCell className="font-medium text-xs px-1 py-1.5">{team.position || team.rank || index + 1}</TableCell>
                                <TableCell className="flex items-center gap-1.5 text-xs px-1 py-1.5">
                                  {(team.team_logo || team.team?.logo) ? (
                                    <img src={team.team_logo || team.team?.logo} alt="" className="w-4 h-4 object-contain" />
                                  ) : (
                                    <div className="w-4 h-4 bg-muted rounded-full" />
                                  )}
                                  <span className="truncate">{team.team_name || team.team?.name || 'Unknown'}</span>
                                </TableCell>
                                <TableCell className="text-center text-xs px-1 py-1.5">{team.played ?? team.all?.played ?? 0}</TableCell>
                                <TableCell className="text-center text-xs px-1 py-1.5">{team.won ?? team.all?.win ?? 0}</TableCell>
                                <TableCell className="text-center text-xs px-1 py-1.5">{team.drawn ?? team.all?.draw ?? 0}</TableCell>
                                <TableCell className="text-center text-xs px-1 py-1.5">{team.lost ?? team.all?.lose ?? 0}</TableCell>
                                <TableCell className="text-center font-bold text-xs px-1 py-1.5">{team.points ?? 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fixtures" className="mt-3">
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm">Recent Fixtures</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {fixtures.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground text-sm mb-1">No fixtures data available</p>
                        <p className="text-[10px] text-muted-foreground">
                          This may be a limitation of the free API plan
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fixtures.map((fixture: any) => (
                          <div key={fixture.id} className="border rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(fixture.startTime).toLocaleDateString()}
                              </span>
                              <Badge 
                                variant={
                                  fixture.status === 'live' ? 'destructive' : 
                                  fixture.status === 'finished' ? 'secondary' : 
                                  'outline'
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {fixture.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-1">
                                <img src={fixture.homeTeamLogo} alt="" className="w-5 h-5" />
                                <span className="text-xs font-medium truncate">{fixture.homeTeam}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3">
                                <span className="text-sm font-bold">
                                  {fixture.homeScore ?? '-'}
                                </span>
                                <span className="text-muted-foreground text-xs">:</span>
                                <span className="text-sm font-bold">
                                  {fixture.awayScore ?? '-'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-1 justify-end">
                                <span className="text-xs font-medium truncate">{fixture.awayTeam}</span>
                                <img src={fixture.awayTeamLogo} alt="" className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scorers" className="mt-3">
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-sm">Top Scorers</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {topScorers.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground text-sm mb-1">No top scorers data available</p>
                        <p className="text-[10px] text-muted-foreground">
                          This may be a limitation of the free API plan
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topScorers.map((player: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-1.5 border rounded-lg">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-[10px]">
                              {index + 1}
                            </div>
                            <img src={player.photo} alt="" className="w-7 h-7 rounded-full" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{player.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{player.team}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{player.goals}</p>
                              <p className="text-[10px] text-muted-foreground">goals</p>
                            </div>
                            {player.assists > 0 && (
                              <div className="text-right">
                                <p className="font-medium text-xs">{player.assists}</p>
                                <p className="text-[10px] text-muted-foreground">assists</p>
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
      <div className="bg-card border-b p-3 sticky top-0 z-10">
        <h1 className="text-base font-bold mb-2">Leagues</h1>
        
        <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType)}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Select sport" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SPORT_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {config.icon} {config.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">Loading leagues...</p>
          </div>
        ) : Object.keys(leaguesByCountry).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">No leagues found for this sport</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(leaguesByCountry)} className="space-y-2">
            {Object.entries(leaguesByCountry).map(([country, countryLeagues]) => (
              <AccordionItem key={country} value={country} className="border rounded-lg">
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{COUNTRY_FLAGS[country] || '🌍'}</span>
                    <div className="text-left">
                      <h3 className="font-bold text-sm">{country}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {countryLeagues.length} {countryLeagues.length === 1 ? 'league' : 'leagues'}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="space-y-1.5 mt-1">
                    {countryLeagues.map((league) => (
                      <Card 
                        key={league.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleLeagueClick(league)}
                      >
                        <CardContent className="p-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {league.logo_url ? (
                              <img src={league.logo_url} alt="" className="w-6 h-6 object-contain" />
                            ) : (
                              <span className="text-lg">{SPORT_CONFIG[league.sport].icon}</span>
                            )}
                            <h4 className="font-medium text-sm">{league.name}</h4>
                          </div>
                          <Badge variant="outline" className="text-[10px]">View</Badge>
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
