import { useState } from "react";
import { ArrowLeft, Coins, Crown, Settings, Moon, Sun, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockUserProfile } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

interface ProfileProps {
  coins: number;
  onBack: () => void;
}

export const Profile = ({ coins, onBack }: ProfileProps) => {
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const { toast } = useToast();

  const handleWatchRewardedAd = () => {
    toast({
      title: "Coins Earned!",
      description: "You earned 25 coins for watching the ad!",
    });
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
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">User Profile</h2>
                <p className="text-muted-foreground">Manage your account settings</p>
              </div>
              {userProfile.isPremium && (
                <Badge className="bg-gradient-coins text-coins-foreground">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gradient-coins/10 rounded-lg">
                <Coins className="h-6 w-6 mx-auto mb-2 text-coins" />
                <p className="text-lg font-bold">{coins.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Coins</p>
              </div>
              <div className="text-center p-4 bg-gradient-primary/10 rounded-lg">
                <Crown className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">{userProfile.isPremium ? 'Active' : 'Free'}</p>
                <p className="text-sm text-muted-foreground">Subscription</p>
              </div>
            </div>
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
              
              <Button className="w-full bg-gradient-coins hover:opacity-90">
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
        </div>
      </div>
    </div>
  );
};