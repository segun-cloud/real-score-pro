import { Coins, Gamepad2, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NotificationToggle } from "./NotificationToggle";

interface HeaderProps {
  coins: number;
  onFunHubClick?: () => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  userId?: string;
  isGuest?: boolean;
  onGuestLogin?: () => void;
}

const sports = [
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'cricket', name: 'Cricket', emoji: '🏏' },
  { id: 'ice-hockey', name: 'Ice Hockey', emoji: '🏒' },
  { id: 'rugby', name: 'Rugby', emoji: '🏉' },
  { id: 'american-football', name: 'American Football', emoji: '🏈' },
];

export const Header = ({ coins, onFunHubClick, selectedSport, onSportChange, userId, isGuest, onGuestLogin }: HeaderProps) => {
  return (
    <header className="glass-strong sticky top-0 z-50 border-b border-border/50">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-medium glow-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold gradient-text tracking-tight">
              RealScore
            </h1>
          </div>
          
          <Select value={selectedSport} onValueChange={onSportChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary/50 border-border/50 rounded-xl hover-lift">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent className="glass-strong rounded-xl border-border/50">
              {sports.map((sport) => (
                <SelectItem 
                  key={sport.id} 
                  value={sport.id} 
                  className="text-sm rounded-lg cursor-pointer"
                >
                  <span className="mr-2">{sport.emoji}</span>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          {isGuest ? (
            <Button 
              variant="default" 
              size="sm"
              onClick={onGuestLogin}
              className="h-8 text-xs rounded-xl gradient-primary border-0 shadow-medium glow-primary hover-lift press-effect"
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" />
              Sign In
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-1.5 gradient-coins px-3 py-1.5 rounded-xl shadow-soft glow-coins animate-pulse-slow">
                <Coins className="h-3.5 w-3.5 text-coins-foreground" />
                <span className="text-xs font-bold text-coins-foreground">{coins.toLocaleString()}</span>
              </div>
              
              <NotificationToggle userId={userId} />
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 rounded-xl bg-secondary/50 hover:bg-primary/10 hover:text-primary hover-lift press-effect"
                onClick={onFunHubClick}
              >
                <Gamepad2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Banner Ad Placeholder */}
      <div className="bg-muted/50 border-t border-border/30 p-2 text-center">
        <div className="bg-secondary/30 rounded-lg py-2 px-4 text-xs text-muted-foreground/70">
          Banner Ad (AdMob ID: ca-app-pub-5502720572669424/8305362784)
        </div>
      </div>
    </header>
  );
};
