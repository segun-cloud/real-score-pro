import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Newspaper, Users, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useToast } from "@/hooks/use-toast";

type FeedType = 'highlights' | 'news' | 'transfers' | 'updates';

interface FeedItem {
  id: string;
  type: FeedType;
  title: string;
  description: string;
  sport: string;
  timestamp: string;
  imageUrl?: string;
  videoUrl?: string;
}


const FEED_CONFIG = {
  highlights: { icon: Play, label: 'Match Highlights', color: 'text-red-500' },
  news: { icon: Newspaper, label: 'Team News', color: 'text-blue-500' },
  transfers: { icon: Users, label: 'Transfers', color: 'text-green-500' },
  updates: { icon: TrendingUp, label: 'Updates', color: 'text-orange-500' },
};

export const Feeds = () => {
  const [selectedTab, setSelectedTab] = useState<FeedType | 'all'>('all');
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFeeds();
  }, [selectedTab]);

  const loadFeeds = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sports-feeds', {
        body: {
          sport: 'all',
          feedType: selectedTab === 'all' ? undefined : selectedTab,
          limit: 20,
        },
      });

      if (error) throw error;
      setFeeds(data.feeds || []);
    } catch (error) {
      console.error('Error loading feeds:', error);
      toast({
        title: "Error loading feeds",
        description: "Unable to load sports feeds. Please try again.",
        variant: "destructive",
      });
      setFeeds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFeeds = feeds;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">Sports Feeds</h1>
        <p className="text-sm text-muted-foreground">Latest news and highlights</p>
      </div>

      <div className="p-4">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as FeedType | 'all')} className="w-full">
          <TabsList className="w-full grid grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="highlights">
              <Play className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="news">
              <Newspaper className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="transfers">
              <Users className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="updates">
              <TrendingUp className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFeeds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No feeds available</p>
              </div>
            ) : (
              filteredFeeds.map((feed) => {
                const config = FEED_CONFIG[feed.type];
                const Icon = config.icon;
                
                return (
                  <Card 
                    key={feed.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      if (feed.videoUrl) {
                        setSelectedVideo({ url: feed.videoUrl, title: feed.title });
                      } else if ((feed as any).externalUrl) {
                        window.open((feed as any).externalUrl, '_blank');
                      } else {
                        toast({
                          title: "Content not available",
                          description: "This feed item doesn't have viewable content yet"
                        });
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{feed.timestamp}</span>
                      </div>
                      <CardTitle className="text-base leading-tight mt-2">{feed.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-2">{feed.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {feed.sport}
                        </Badge>
                        {feed.videoUrl && (
                          <Badge variant="default" className="text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            Watch
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <VideoPlayer
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.url || ''}
        title={selectedVideo?.title || ''}
      />
    </div>
  );
};
