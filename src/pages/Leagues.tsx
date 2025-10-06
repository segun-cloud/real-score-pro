import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPORT_CONFIG, type SportType } from "@/types/funhub";
import { Trophy, MapPin } from "lucide-react";

interface League {
  id: string;
  country: string;
  name: string;
  tier: number;
  sport: SportType;
  logo_url: string | null;
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
  'International': '🌍',
};

export const Leagues = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedSport, setSelectedSport] = useState<SportType>('football');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

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

  const handleLeagueClick = (league: League) => {
    setSelectedLeague(league);
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
          <h1 className="text-xl font-bold flex items-center gap-2">
            {COUNTRY_FLAGS[selectedLeague.country]} {selectedLeague.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {SPORT_CONFIG[selectedLeague.sport].icon} {SPORT_CONFIG[selectedLeague.sport].name} • Tier {selectedLeague.tier}
          </p>
        </div>

        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                League Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Country</span>
                <span className="font-medium">{COUNTRY_FLAGS[selectedLeague.country]} {selectedLeague.country}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sport</span>
                <span className="font-medium">{SPORT_CONFIG[selectedLeague.sport].icon} {SPORT_CONFIG[selectedLeague.sport].name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Division Tier</span>
                <Badge variant="secondary">Tier {selectedLeague.tier}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Standings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Standings data coming soon. Create a team and join competitions to see your progress!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Featured Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Match fixtures coming soon. Stay tuned for upcoming games!
              </p>
            </CardContent>
          </Card>
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
          <Accordion type="multiple" className="space-y-3">
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
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{SPORT_CONFIG[league.sport].icon}</span>
                            <div>
                              <h4 className="font-medium">{league.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Tier {league.tier}
                              </p>
                            </div>
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
