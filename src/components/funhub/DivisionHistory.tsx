import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DIVISION_CONFIG } from "@/types/funhub";

interface DivisionMovement {
  id: string;
  season_id: string;
  from_division: number;
  to_division: number;
  movement_type: 'promotion' | 'relegation' | 'stayed';
  final_position: number;
  season: {
    season_number: number;
  };
}

interface DivisionHistoryProps {
  teamId: string;
}

export const DivisionHistory = ({ teamId }: DivisionHistoryProps) => {
  const [history, setHistory] = useState<DivisionMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [teamId]);

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('division_movements')
        .select(`
          *,
          season:seasons(season_number)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (data) {
        setHistory(data as DivisionMovement[]);
      }
    } catch (error) {
      console.error('Error loading division history:', error);
      toast.error('Failed to load division history');
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'promotion':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'relegation':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'promotion':
        return 'bg-green-500/10 border-green-500/20';
      case 'relegation':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-muted';
    }
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No division history yet. Complete a season to see your progress!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((movement) => {
        const fromDiv = DIVISION_CONFIG.find(d => d.level === movement.from_division);
        const toDiv = DIVISION_CONFIG.find(d => d.level === movement.to_division);

        return (
          <Card key={movement.id} className={getMovementColor(movement.movement_type)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getMovementIcon(movement.movement_type)}
                  <div>
                    <div className="font-semibold">
                      Season {movement.season.season_number}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Position: {movement.final_position}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={`division${movement.from_division}` as any}>
                    {fromDiv?.name}
                  </Badge>
                  {movement.movement_type !== 'stayed' && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant={`division${movement.to_division}` as any}>
                        {toDiv?.name}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
