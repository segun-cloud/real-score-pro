import { useState, useEffect } from "react";
import { ArrowLeft, Coins, Crown, Settings, Moon, Sun, Bell, Info, User, Mail, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockUserProfile } from "@/data/mockData";
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
      
      // Get current coins
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', user.id)
        .single();
      
      if (!profile) {
        sonnerToast.error('Profile not found');
        return;
      }
      
      // Add coins to database
      const { error } = await supabase
        .from('user_profiles')
        .update({ coins: profile.coins + 25 })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update parent component state
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
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profileData?.username.substring(0, 2).toUpperCase() || 'JD'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{profileData?.username || 'Loading...'}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profileData?.email || 'Loading...'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{profileData?.username || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Teams Created</p>
                  <p className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {profileData?.teams_count || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Coins</p>
                  <p className="font-medium flex items-center gap-1">
                    <Coins className="h-4 w-4 text-primary" />
                    {coins}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coins Management */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Coins className="h-4 w-4 text-coins" />
              Earn More Coins
            </h3>
            
            <div className="space-y-3">
              <Button 
                onClick={handleWatchRewardedAd}
                variant="outline" 
                className="w-full justify-between"
              >
                <span>Watch Rewarded Ad</span>
                <Badge variant="secondary">+25 coins</Badge>
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Daily Check-in</span>
                    <Badge variant="secondary">+10 coins</Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Daily Check-in</DialogTitle>
                  </DialogHeader>
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">Come back tomorrow for your daily reward!</p>
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <div key={day} className="text-center p-2 bg-secondary rounded">
                          <div className="text-xs">Day {day}</div>
                          <div className="text-sm font-semibold">{day * 5}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Premium Subscription */}
          {!userProfile.isPremium && (
            <Card className="p-4 bg-gradient-coins/5 border-coins/20">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="h-5 w-5 text-coins" />
                <h3 className="font-semibold">Upgrade to Premium</h3>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Ad-free experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Unlimited AI predictions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Premium insights & analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Priority customer support</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-coins hover:opacity-90"
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

          {/* Settings */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span>Dark Mode</span>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4" />
                  <span>Push Notifications</span>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
            </div>
          </Card>

          {/* About */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Info className="h-4 w-4" />
              About
            </h3>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>RealScore v1.0.0</p>
              <p>Your premier sports companion with live scores, AI predictions, and comprehensive match analysis.</p>
              <div className="pt-2">
                <Button variant="ghost" size="sm" className="p-0 h-auto">Privacy Policy</Button>
                <span className="mx-2">•</span>
                <Button variant="ghost" size="sm" className="p-0 h-auto">Terms of Service</Button>
                <span className="mx-2">•</span>
                <Button variant="ghost" size="sm" className="p-0 h-auto">Support</Button>
              </div>
            </div>
          </Card>

          {/* Account Section */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Account
            </h3>
            <Button
              variant="destructive"
              className="w-full"
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