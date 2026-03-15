import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, TrendingUp, TrendingDown, Calendar, Award, Clock, Siren, CreditCard, CircleDot, Newspaper, Flag, AlertTriangle } from "lucide-react";

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

interface NotificationsListProps {
  userId: string;
  onUpdate: () => void;
}

export const NotificationsList = ({ userId, onUpdate }: NotificationsListProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'matches' | 'news'>('all');

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      onUpdate();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onUpdate();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return <CircleDot className="h-5 w-5 text-green-500" />;
      case 'red_card':
        return <CreditCard className="h-5 w-5 text-red-500" />;
      case 'yellow_card':
        return <CreditCard className="h-5 w-5 text-yellow-500" />;
      case 'penalty':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'match_kickoff':
        return <Siren className="h-5 w-5 text-green-500" />;
      case 'halftime':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'match_ended':
        return <Flag className="h-5 w-5 text-muted-foreground" />;
      case 'match_reminder':
        return <Clock className="h-5 w-5 text-primary" />;
      case 'news':
        return <Newspaper className="h-5 w-5 text-blue-500" />;
      case 'promotion':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'relegation':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'prize_awarded':
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 'season_start':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'match_result':
        return <Trophy className="h-5 w-5 text-primary" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const matchTypes = ['goal', 'red_card', 'yellow_card', 'penalty', 'match_kickoff', 'halftime', 'match_ended', 'match_reminder', 'match_result'];
  const newsTypes = ['news'];

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'matches') return matchTypes.includes(n.notification_type);
    if (filter === 'news') return newsTypes.includes(n.notification_type);
    return true;
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No notifications yet
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-3 mt-3">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
          <TabsTrigger value="matches" className="flex-1 text-xs">Matches</TabsTrigger>
          <TabsTrigger value="news" className="flex-1 text-xs">News</TabsTrigger>
        </TabsList>
      </Tabs>

      {unreadCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          className="w-full text-xs"
        >
          Mark all as read ({unreadCount})
        </Button>
      )}

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors ${
                !notification.read ? 'bg-primary/5 border-primary/20' : ''
              }`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <h4 className="font-semibold text-xs">{notification.title}</h4>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredNotifications.length === 0 && (
            <div className="py-6 text-center text-muted-foreground text-xs">
              No {filter} notifications
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
