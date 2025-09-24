import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Home } from "./pages/Home";
import { MatchDetails } from "./pages/MatchDetails";
import { Profile } from "./pages/Profile";
import { Match } from "./types/sports";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";

const queryClient = new QueryClient();

type Screen = 'home' | 'match-details' | 'profile';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const handleMatchClick = (match: Match) => {
    setSelectedMatchId(match.id);
    setCurrentScreen('match-details');
  };

  const handleBack = () => {
    setCurrentScreen('home');
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
      case 'home':
        return (
          <Home 
            onMatchClick={handleMatchClick}
            onProfileClick={handleProfileClick}
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
            onProfileClick={handleProfileClick}
            selectedSport={selectedSport}
          />
        );
      case 'profile':
        return <Profile onBack={handleBack} />;
      default:
        return (
          <Home 
            onMatchClick={handleMatchClick}
            onProfileClick={handleProfileClick}
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
          <div className="min-h-screen w-full flex bg-background">
            <AppSidebar 
              selectedSport={selectedSport} 
              onSportChange={handleSportChange}
            />
            <main className="flex-1">
              <div className="h-12 flex items-center border-b bg-card px-4">
                <SidebarTrigger />
              </div>
              {renderScreen()}
            </main>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
