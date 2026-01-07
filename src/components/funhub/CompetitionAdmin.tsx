import { useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SportType } from "@/types/funhub";
import { SPORT_CONFIG } from "@/types/funhub";

type CompetitionFormat = 'single_round_robin' | 'double_round_robin';

export const CompetitionAdmin = () => {
  const [selectedSport, setSelectedSport] = useState<SportType>('football');
  const [selectedFormat, setSelectedFormat] = useState<CompetitionFormat>('single_round_robin');
  const [registrationDeadline, setRegistrationDeadline] = useState<Date>(addDays(new Date(), 5));
  const [isLoading, setIsLoading] = useState(false);

  const handleInitializeSeason = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-season', {
        body: { 
          sport: selectedSport, 
          format: selectedFormat,
          registrationDeadline: registrationDeadline.toISOString()
        }
      });

      if (error) throw error;

      toast.success(`Season initialized for ${selectedSport}! Created ${data.competitions.length} competitions with ${selectedFormat.replace('_', ' ')} format.`);
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

        <div>
          <label className="text-sm font-medium mb-2 block">Competition Format</label>
          <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as CompetitionFormat)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single_round_robin">Single Round-Robin (each team plays once)</SelectItem>
              <SelectItem value="double_round_robin">Double Round-Robin (home & away)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Registration Deadline</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !registrationDeadline && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {registrationDeadline ? format(registrationDeadline, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={registrationDeadline}
                onSelect={(date) => date && setRegistrationDeadline(date)}
                disabled={(date) => date < new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">
            Last day for teams to register for competitions
          </p>
        </div>

        {/* Season Preview Summary */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <h4 className="font-semibold text-sm">📋 Season Preview</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">Sport:</span>
            <span className="font-medium">{SPORT_CONFIG[selectedSport].icon} {SPORT_CONFIG[selectedSport].name}</span>
            
            <span className="text-muted-foreground">Format:</span>
            <span className="font-medium">{selectedFormat === 'single_round_robin' ? 'Single Round-Robin' : 'Double Round-Robin'}</span>
            
            <span className="text-muted-foreground">Divisions:</span>
            <span className="font-medium">5 divisions</span>
            
            <span className="text-muted-foreground">Registration Closes:</span>
            <span className="font-medium">{format(registrationDeadline, "PPP")}</span>
            
            <span className="text-muted-foreground">Season Duration:</span>
            <span className="font-medium">{selectedFormat === 'single_round_robin' ? '4 weeks' : '6 weeks'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleInitializeSeason} 
            disabled={isLoading}
            className="w-full"
          >
            1. Initialize New Season
          </Button>
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