import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MatchCard } from '@/components/MatchCard';
import { Match } from '@/types/sports';

export const Favourites = () => {
  const [favourites, setFavourites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');

  useEffect(() => {
    loadFavourites();
  }, []);

  const loadFavourites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_favourites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFavourites(data || []);
    } catch (error) {
      console.error('Error loading favourites:', error);
      toast.error('Failed to load favourites');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavourite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_favourites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFavourites(prev => prev.filter(f => f.id !== id));
      toast.success('Removed from favourites');
    } catch (error) {
      console.error('Error removing favourite:', error);
      toast.error('Failed to remove favourite');
    }
  };

  const matchFavourites = favourites.filter(f => f.entity_type === 'match');
  const teamFavourites = favourites.filter(f => f.entity_type === 'team');
  const leagueFavourites = favourites.filter(f => f.entity_type === 'league');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">Loading favourites...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 fill-primary text-primary" />
          <h1 className="text-xl font-bold">Favourites</h1>
        </div>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">Matches ({matchFavourites.length})</TabsTrigger>
            <TabsTrigger value="teams">Teams ({teamFavourites.length})</TabsTrigger>
            <TabsTrigger value="leagues">Leagues ({leagueFavourites.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-4 mt-4">
            {matchFavourites.length === 0 ? (
              <p className="text-muted-foreground text-center mt-8">
                No favourite matches yet
              </p>
            ) : (
              matchFavourites.map(fav => (
                <Card key={fav.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <MatchCard 
                          match={fav.entity_data as Match} 
                          onClick={() => {}} 
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFavourite(fav.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4 mt-4">
            {teamFavourites.length === 0 ? (
              <p className="text-muted-foreground text-center mt-8">
                No favourite teams yet
              </p>
            ) : (
              teamFavourites.map(fav => (
                <Card key={fav.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{fav.entity_data.name || fav.entity_data.team_name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFavourite(fav.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="leagues" className="space-y-4 mt-4">
            {leagueFavourites.length === 0 ? (
              <p className="text-muted-foreground text-center mt-8">
                No favourite leagues yet
              </p>
            ) : (
              leagueFavourites.map(fav => (
                <Card key={fav.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{fav.entity_data.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFavourite(fav.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
