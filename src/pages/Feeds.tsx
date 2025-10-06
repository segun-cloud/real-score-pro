import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Newspaper, Users, TrendingUp } from "lucide-react";

type FeedType = 'highlights' | 'news' | 'transfers' | 'updates';

interface FeedItem {
  id: string;
  type: FeedType;
  title: string;
  description: string;
  sport: string;
  timestamp: string;
  imageUrl?: string;
}

const mockFeeds: FeedItem[] = [
  {
    id: '1',
    type: 'highlights',
    title: 'Real Madrid vs Barcelona - Last Minute Winner!',
    description: 'Vinicius Jr. scores in the 78th minute to secure a 2-1 victory in El Clásico',
    sport: '⚽ Football',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'news',
    title: 'Manchester United Announce New Manager',
    description: 'Premier League club confirms appointment of Erik ten Hag as new head coach',
    sport: '⚽ Football',
    timestamp: '3 hours ago',
  },
  {
    id: '3',
    type: 'transfers',
    title: 'Kylian Mbappé to Real Madrid - Deal Confirmed',
    description: 'French superstar signs 5-year contract worth €200M',
    sport: '⚽ Football',
    timestamp: '5 hours ago',
  },
  {
    id: '4',
    type: 'highlights',
    title: 'Lakers Edge Out Warriors in Overtime Thriller',
    description: 'LeBron James drops 45 points as Lakers win 112-108',
    sport: '🏀 Basketball',
    timestamp: '6 hours ago',
  },
  {
    id: '5',
    type: 'updates',
    title: 'Premier League Weekend Preview',
    description: 'Top 5 matches to watch this weekend including Arsenal vs Chelsea',
    sport: '⚽ Football',
    timestamp: '8 hours ago',
  },
  {
    id: '6',
    type: 'news',
    title: 'Novak Djokovic Wins 24th Grand Slam',
    description: 'Serbian legend makes history at Australian Open',
    sport: '🎾 Tennis',
    timestamp: '1 day ago',
  },
  {
    id: '7',
    type: 'transfers',
    title: 'Harry Kane Joins Bayern Munich',
    description: 'English striker completes €100M move to Bundesliga champions',
    sport: '⚽ Football',
    timestamp: '1 day ago',
  },
  {
    id: '8',
    type: 'highlights',
    title: 'Tyson Fury Retains WBC Heavyweight Title',
    description: 'Gypsy King defeats Deontay Wilder in epic trilogy finale',
    sport: '🥊 Boxing',
    timestamp: '2 days ago',
  },
];

const FEED_CONFIG = {
  highlights: { icon: Play, label: 'Match Highlights', color: 'text-red-500' },
  news: { icon: Newspaper, label: 'Team News', color: 'text-blue-500' },
  transfers: { icon: Users, label: 'Transfers', color: 'text-green-500' },
  updates: { icon: TrendingUp, label: 'Updates', color: 'text-orange-500' },
};

export const Feeds = () => {
  const [selectedTab, setSelectedTab] = useState<FeedType | 'all'>('all');

  const filteredFeeds = selectedTab === 'all' 
    ? mockFeeds 
    : mockFeeds.filter(feed => feed.type === selectedTab);

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
            {filteredFeeds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No feeds available</p>
              </div>
            ) : (
              filteredFeeds.map((feed) => {
                const config = FEED_CONFIG[feed.type];
                const Icon = config.icon;
                
                return (
                  <Card key={feed.id} className="cursor-pointer hover:border-primary transition-colors">
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
                      <Badge variant="outline" className="text-xs">
                        {feed.sport}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
