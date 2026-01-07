import { Home, Trophy, Heart, Rss, User } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <div className="mx-auto max-w-[480px] flex justify-around items-center h-16 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full gap-1 rounded-none ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'fill-primary' : ''}`} />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
