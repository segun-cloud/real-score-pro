import { Home, Trophy, Heart, Rss, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navigationItems: NavigationItem[] = [
  { id: 'matches', label: 'Matches', icon: Home },
  { id: 'leagues', label: 'Leagues', icon: Trophy },
  { id: 'favourites', label: 'Favourites', icon: Heart },
  { id: 'feeds', label: 'Feeds', icon: Rss },
  { id: 'profile', label: 'Profile', icon: User },
];

interface BottomNavigationProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export const BottomNavigation = ({ activeScreen, onNavigate }: BottomNavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border/30 z-50 animate-slide-up">
      <div className="mx-auto max-w-[480px] flex justify-around items-center h-12 px-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-full gap-0 relative press-effect",
                "transition-all duration-300 rounded-lg mx-0.5",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full gradient-primary shadow-sm" />
              )}
              
              <div className={cn(
                "p-1 rounded-lg transition-all duration-300",
                isActive && "bg-primary/10 glow-primary"
              )}>
                <Icon className={cn(
                  "h-4 w-4 transition-all duration-300",
                  isActive && "scale-110"
                )} />
              </div>
              
              <span className={cn(
                "text-[10px] font-medium transition-all duration-300",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Safe area for notched devices */}
      <div className="h-safe-area-inset-bottom bg-transparent" />
    </nav>
  );
};
