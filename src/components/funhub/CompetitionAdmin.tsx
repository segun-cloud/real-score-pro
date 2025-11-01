import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SportType } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";

export const CompetitionAdmin = () => {
  const [selectedSport, setSelectedSport] = useState<SportType>('football');
  const [isLoading, setIsLoading] = useState(false);

  const handleInitializeSeason = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-season', {
        body: { sport: selectedSport }
      });

      if (error) throw error;

      toast.success(`Season initialized for ${selectedSport}! Created ${data.competitions.length} competitions.`);
    } catch (error) {
      console.error('Error initializing season:', error);
      toast.error('Failed to initialize season');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFixtures = async () => {
    setIsLoading(true);
    try {
      // Get all competitions for the selected sport that need fixtures
      const { data: competitions } = await supabase
        .from('competitions')
        .select('id, name, match_generation_status')
        .eq('sport', selectedSport)
        .eq('match_generation_status', 'pending')
        .eq('status', 'upcoming');

      if (!competitions || competitions.length === 0) {
        toast.info('No competitions need fixture generation');
        setIsLoading(false);
        return;
      }

      // Generate fixtures for each competition
      for (const comp of competitions) {
        const { error } = await supabase.functions.invoke('generate-fixtures', {
          body: { competitionId: comp.id }
        });

        if (error) {
          console.error(`Error generating fixtures for ${comp.name}:`, error);
          continue;
        }
      }

      toast.success(`Generated fixtures for ${competitions.length} competitions!`);
    } catch (error) {
      console.error('Error generating fixtures:', error);
      toast.error('Failed to generate fixtures');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateMatches = async () => {
    setIsLoading(true);
    try {
      // Get scheduled matches for active competitions
      const { data: activeComps } = await supabase
        .from('competitions')
        .select('id')
        .eq('sport', selectedSport)
        .eq('status', 'active');

      if (!activeComps || activeComps.length === 0) {
        toast.info('No active competitions found');
        setIsLoading(false);
        return;
      }

      const compIds = activeComps.map(c => c.id);

      // Get scheduled matches
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .in('competition_id', compIds)
        .eq('status', 'scheduled')
        .lte('match_date', new Date().toISOString())
        .limit(20); // Simulate up to 20 matches at a time

      if (!matches || matches.length === 0) {
        toast.info('No matches ready to simulate');
        setIsLoading(false);
        return;
      }

      // Simulate each match
      let successCount = 0;
      for (const match of matches) {
        const { error } = await supabase.functions.invoke('simulate-match', {
          body: { matchId: match.id }
        });

        if (!error) {
          successCount++;
        }
      }

      toast.success(`Simulated ${successCount} matches!`);
    } catch (error) {
      console.error('Error simulating matches:', error);
      toast.error('Failed to simulate matches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessSeasonEnd = async () => {
    setIsLoading(true);
    try {
      // Get completed competitions that need processing
      const { data: competitions } = await supabase
        .from('competitions')
        .select('id, name')
        .eq('sport', selectedSport)
        .eq('status', 'active')
        .lte('end_date', new Date().toISOString());

      if (!competitions || competitions.length === 0) {
        toast.info('No seasons ready to process');
        setIsLoading(false);
        return;
      }

      // Process each competition
      for (const comp of competitions) {
        const { error } = await supabase.functions.invoke('process-season-end', {
          body: { competitionId: comp.id }
        });

        if (error) {
          console.error(`Error processing ${comp.name}:`, error);
          continue;
        }
      }

      toast.success(`Processed ${competitions.length} competitions! Check for promotions/relegations.`);
    } catch (error) {
      console.error('Error processing season end:', error);
      toast.error('Failed to process season end');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competition Admin Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Sport</label>
          <Select value={selectedSport} onValueChange={(value) => setSelectedSport(value as SportType)}>
            <SelectTrigger>
              <SelectValue />
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

        <div className="space-y-2">
          <Button 
            onClick={handleInitializeSeason} 
            disabled={isLoading}
            className="w-full"
          >
            1. Initialize New Season
          </Button>
          <p className="text-xs text-muted-foreground">
            Creates a new season with competitions for all 5 divisions
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleGenerateFixtures} 
            disabled={isLoading}
            variant="secondary"
            className="w-full"
          >
            2. Generate Fixtures
          </Button>
          <p className="text-xs text-muted-foreground">
            Creates round-robin fixtures for competitions with participants
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleSimulateMatches} 
            disabled={isLoading}
            variant="secondary"
            className="w-full"
          >
            3. Simulate Matches
          </Button>
          <p className="text-xs text-muted-foreground">
            Simulates scheduled matches and updates standings
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleProcessSeasonEnd} 
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            4. Process Season End
          </Button>
          <p className="text-xs text-muted-foreground">
            Handles promotions/relegations and awards prizes
          </p>
        </div>
      </CardContent>
    </Card>
  );
};