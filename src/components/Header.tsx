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
      <div className="flex items-center justify-between px-2.5 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center shadow-medium glow-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-bold gradient-text tracking-tight">
              RealScore
            </h1>
          </div>
          
          <Select value={selectedSport} onValueChange={onSportChange}>
            <SelectTrigger className="w-[110px] h-7 text-[11px] bg-secondary/50 border-border/50 rounded-lg hover-lift">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent className="glass-strong rounded-xl border-border/50">
              {sports.map((sport) => (
                <SelectItem 
                  key={sport.id} 
                  value={sport.id} 
                  className="text-xs rounded-lg cursor-pointer"
                >
                  <span className="mr-1.5">{sport.emoji}</span>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1.5">
          {isGuest ? (
            <Button 
              variant="default" 
              size="sm"
              onClick={onGuestLogin}
              className="h-7 text-[11px] rounded-lg gradient-primary border-0 shadow-medium glow-primary hover-lift press-effect px-2.5"
            >
              <LogIn className="h-3 w-3 mr-1" />
              Sign In
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-1 gradient-coins px-2 py-1 rounded-lg shadow-soft glow-coins animate-pulse-slow">
                <Coins className="h-3 w-3 text-coins-foreground" />
                <span className="text-[11px] font-bold text-coins-foreground">{coins.toLocaleString()}</span>
              </div>
              
              <NotificationToggle userId={userId} />
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 rounded-lg gradient-primary border-0 shadow-medium glow-primary hover-lift press-effect"
                onClick={onFunHubClick}
              >
                <Gamepad2 className="h-3.5 w-3.5 text-primary-foreground" />
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
