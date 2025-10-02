import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Home } from "./pages/Home";
import { MatchDetails } from "./pages/MatchDetails";
import { Profile } from "./pages/Profile";
import { Leagues } from "./pages/Leagues";
import { Favourites } from "./pages/Favourites";
import { Feeds } from "./pages/Feeds";
import { FunHub } from "./pages/FunHub";
import { Match } from "./types/sports";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { BottomNavigation } from "./components/BottomNavigation";

const queryClient = new QueryClient();

type Screen = 'matches' | 'match-details' | 'profile' | 'leagues' | 'favourites' | 'feeds' | 'fun-hub';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('matches');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const handleMatchClick = (match: Match) => {
    setSelectedMatchId(match.id);
    setCurrentScreen('match-details');
  };

  const handleBack = () => {
    setCurrentScreen('matches');
    setSelectedMatchId(null);
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
    setSelectedMatchId(null);
  };

  const handleProfileClick = () => {
    setCurrentScreen('profile');
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'matches':
        return (
          <Home 
            onMatchClick={handleMatchClick}
            selectedSport={selectedSport}
          />
        );
      case 'match-details':
        return selectedMatchId ? (
          <MatchDetails 
            matchId={selectedMatchId}
            onBack={handleBack}
            onProfileClick={handleProfileClick}
          />
        ) : (
          <Home 
            onMatchClick={handleMatchClick}
            selectedSport={selectedSport}
          />
        );
      case 'profile':
        return <Profile onBack={handleBack} />;
      case 'leagues':
        return <Leagues />;
      case 'favourites':
        return <Favourites />;
      case 'feeds':
        return <Feeds />;
      case 'fun-hub':
        return <FunHub />;
      default:
        return (
          <Home 
            onMatchClick={handleMatchClick}
            selectedSport={selectedSport}
          />
        );
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SidebarProvider>
          <div className="min-h-screen w-full flex bg-background overflow-x-hidden">
            <AppSidebar 
              selectedSport={selectedSport} 
              onSportChange={handleSportChange}
            />
            <main className="flex-1 min-w-0 overflow-x-hidden">
              <div className="h-12 flex items-center border-b bg-card px-4">
                <SidebarTrigger />
              </div>
              <div className="mx-auto w-full max-w-[480px] pb-16">
                {renderScreen()}
              </div>
            </main>
          </div>
          <BottomNavigation 
            activeScreen={currentScreen === 'match-details' ? 'matches' : currentScreen}
            onNavigate={handleNavigate}
          />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
