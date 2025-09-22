import { Coins, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  coins: number;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

export const Header = ({ coins, onMenuClick, onProfileClick }: HeaderProps) => {
  return (
    <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            RealScore
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gradient-coins px-3 py-2 rounded-lg">
            <Coins className="h-4 w-4 text-coins-foreground" />
            <span className="font-semibold text-coins-foreground">{coins.toLocaleString()}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onProfileClick}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Banner Ad Placeholder */}
      <div className="bg-muted border-t border-border p-2 text-center">
        <div className="bg-secondary/50 rounded py-2 px-4 text-sm text-muted-foreground">
          Banner Ad (AdMob ID: ca-app-pub-5502720572669424/8305362784)
        </div>
      </div>
    </header>
  );
};