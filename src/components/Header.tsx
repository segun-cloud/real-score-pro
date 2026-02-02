import { Coins, Gamepad2, LogIn } from "lucide-react";
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
    <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            RealScore
          </h1>
          
          <Select value={selectedSport} onValueChange={onSportChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent className="bg-card z-[100]">
              {sports.map((sport) => (
                <SelectItem key={sport.id} value={sport.id} className="text-sm">
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
              className="h-8 text-xs"
            >
              <LogIn className="h-3 w-3 mr-1" />
              Sign In
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-gradient-coins px-2 py-1 rounded-lg">
                <Coins className="h-3 w-3 text-coins-foreground" />
                <span className="text-xs font-semibold text-coins-foreground">{coins.toLocaleString()}</span>
              </div>
              
              <NotificationToggle userId={userId} />
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={onFunHubClick}
              >
                <Gamepad2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Banner Ad Placeholder */}
      <div className="bg-muted border-t border-border p-2 text-center">
        <div className="bg-secondary/50 rounded py-2 px-4 text-xs text-muted-foreground">
          Banner Ad (AdMob ID: ca-app-pub-5502720572669424/8305362784)
        </div>
      </div>
    </header>
  );
};