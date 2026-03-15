import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, Goal, CreditCard, Clock, Flag, Newspaper, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSettingsProps {
  userId: string;
}

interface Preferences {
  match_reminders: boolean;
  match_kickoff: boolean;
  goals: boolean;
  cards: boolean;
  penalties: boolean;
  match_end: boolean;
  news_updates: boolean;
}

const defaultPrefs: Preferences = {
  match_reminders: true,
  match_kickoff: true,
  goals: true,
  cards: true,
  penalties: true,
  match_end: true,
  news_updates: true,
};

export const NotificationSettings = ({ userId }: NotificationSettingsProps) => {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setPrefs({
          match_reminders: data.match_reminders,
          match_kickoff: data.match_kickoff,
          goals: data.goals,
          cards: data.cards,
          penalties: data.penalties,
          match_end: data.match_end,
          news_updates: data.news_updates,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...newPrefs,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
      setPrefs(prefs); // revert
    }
  };

  if (loading) return null;

  const settings = [
    { key: 'match_reminders' as const, label: 'Match Reminders', desc: '1 hour before kickoff', icon: <Clock className="h-3.5 w-3.5 text-primary" /> },
    { key: 'match_kickoff' as const, label: 'Kick Off Alerts', desc: 'When match starts', icon: <Bell className="h-3.5 w-3.5 text-green-500" /> },
    { key: 'goals' as const, label: 'Goals', desc: 'Goal scored notifications', icon: <Goal className="h-3.5 w-3.5 text-green-500" /> },
    { key: 'cards' as const, label: 'Cards', desc: 'Yellow & red cards', icon: <CreditCard className="h-3.5 w-3.5 text-yellow-500" /> },
    { key: 'penalties' as const, label: 'Penalties', desc: 'Penalty events', icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> },
    { key: 'match_end' as const, label: 'Match End', desc: 'Half time & full time', icon: <Flag className="h-3.5 w-3.5 text-muted-foreground" /> },
    { key: 'news_updates' as const, label: 'News & Transfers', desc: 'Injuries, transfers, updates', icon: <Newspaper className="h-3.5 w-3.5 text-blue-500" /> },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Bell className="h-4 w-4" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        <p className="text-[10px] text-muted-foreground">
          Choose which alerts you receive for your favourited matches, teams, and leagues.
        </p>
        {settings.map(({ key, label, desc, icon }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => updatePreference(key, v)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
