import { useState, useEffect } from "react";
import { ArrowLeft, Coins, Crown, Settings, Moon, Sun, Bell, Info, User, Mail, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockUserProfile } from "@/data/mockData";
import { NotificationSettings } from "@/components/NotificationSettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

interface ProfileProps {
  coins: number;
  onBack: () => void;
  onLogout: () => void;
  onCoinsUpdate: () => void;
}

export const Profile = ({ coins, onBack, onLogout, onCoinsUpdate }: ProfileProps) => {
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    username: string;
    email: string;
    created_at: string;
    teams_count: number;
  } | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, created_at')
        .eq('id', user.id)
        .single();

      const { count: teamsCount } = await supabase
        .from('user_teams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (profile) {
        setProfileData({
          username: profile.username,
          email: user.email || '',
          created_at: profile.created_at,
          teams_count: teamsCount || 0
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      sonnerToast.error('Failed to load profile');
    }
  };

  const handleWatchRewardedAd = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sonnerToast.error('Authentication required');
        return;
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', user.id)
        .single();
      
      if (!profile) {
        sonnerToast.error('Profile not found');
        return;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ coins: profile.coins + 25 })
        .eq('id', user.id);
      
      if (error) throw error;
      
      onCoinsUpdate();
      
      toast({
        title: "Coins Earned!",
        description: "You earned 25 coins for watching the ad!",
      });
    } catch (error) {
      console.error('Error adding coins:', error);
      sonnerToast.error('Failed to add coins');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b p-3 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold">Profile</h1>
        </div>
      </div>
      
      <div className="p-3">
        <div className="space-y-3">
          {/* User Info Card */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <User className="h-4 w-4" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3">
              <div className="flex items-center gap-3 pb-3 border-b">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {profileData?.username.substring(0, 2).toUpperCase() || 'JD'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{profileData?.username || 'Loading...'}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {profileData?.email || 'Loading...'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Username</p>
                  <p className="font-medium text-xs">{profileData?.username || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Teams Created</p>
                  <p className="font-medium text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {profileData?.teams_count || 0}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Member Since</p>
                  <p className="font-medium text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Total Coins</p>
                  <p className="font-medium text-xs flex items-center gap-1">
                    <Coins className="h-3 w-3 text-primary" />
                    {coins}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coins Management */}
          <Card className="p-3">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-coins" />
              Earn More Coins
            </h3>
            
            <div className="space-y-2">
              <Button 
                onClick={handleWatchRewardedAd}
                variant="outline" 
                className="w-full justify-between h-8 text-xs"
              >
                <span>Watch Rewarded Ad</span>
                <Badge variant="secondary" className="text-[10px]">+25 coins</Badge>
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-8 text-xs">
                    <span>Daily Check-in</span>
                    <Badge variant="secondary" className="text-[10px]">+10 coins</Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-sm">Daily Check-in</DialogTitle>
                  </DialogHeader>
                  <div className="text-center py-3">
                    <p className="text-muted-foreground text-xs mb-3">Come back tomorrow for your daily reward!</p>
                    <div className="grid grid-cols-7 gap-1.5 mb-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <div key={day} className="text-center p-1.5 bg-secondary rounded">
                          <div className="text-[10px]">Day {day}</div>
                          <div className="text-xs font-semibold">{day * 5}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Testing Mode */}
          <Card className="p-3 bg-primary/5 border-primary/20 border-dashed border-2">
            <h3 className="font-semibold text-sm mb-1.5 flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-primary" />
              Testing Mode
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Setup dummy competitions, teams, and fixtures for testing
            </p>
            <Button 
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke('setup-dummy-data', {
                    method: 'POST',
                  });

                  if (error) throw error;

                  sonnerToast.success("Dummy data created successfully! Check competitions and your teams.");
                  console.log('Setup result:', data);
                } catch (error: any) {
                  console.error("Error setting up dummy data:", error);
                  sonnerToast.error(error.message || "Failed to setup dummy data");
                }
              }}
              className="w-full h-8 text-xs"
            >
              Setup Dummy Data
            </Button>
          </Card>

          {/* Premium Subscription */}
          {!userProfile.isPremium && (
            <Card className="p-3 bg-gradient-coins/5 border-coins/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-coins" />
                <h3 className="font-semibold text-sm">Upgrade to Premium</h3>
              </div>
              
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-success">✓</span>
                  <span>Ad-free experience</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-success">✓</span>
                  <span>Unlimited AI predictions</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-success">✓</span>
                  <span>Premium insights & analysis</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-success">✓</span>
                  <span>Priority customer support</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-coins hover:opacity-90 h-8 text-xs"
                onClick={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Premium subscriptions will be available soon!",
                  });
                }}
              >
                Subscribe for $0.99/month
              </Button>
            </Card>
          )}

          {/* Notification Preferences */}
          {currentUserId && (
            <NotificationSettings userId={currentUserId} />
          )}

          {/* Settings */}
          <Card className="p-3">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  <span className="text-sm">Dark Mode</span>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="text-sm">Push Notifications</span>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </div>
          </Card>

          {/* About */}
          <Card className="p-3">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              About
            </h3>
            
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>RealScore v1.0.0</p>
              <p>Your premier sports companion with live scores, AI predictions, and comprehensive match analysis.</p>
              <div className="pt-1.5">
                <Button variant="ghost" size="sm" className="p-0 h-auto text-xs">Privacy Policy</Button>
                <span className="mx-1.5">•</span>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-xs">Terms of Service</Button>
                <span className="mx-1.5">•</span>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-xs">Support</Button>
              </div>
            </div>
          </Card>

          {/* Account Section */}
          <Card className="p-3">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Account
            </h3>
            <Button
              variant="destructive"
              className="w-full h-8 text-xs"
              onClick={onLogout}
            >
              Sign Out
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
