import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Home } from "./pages/Home";
import { MatchDetails } from "./pages/MatchDetails";
import { Profile } from "./pages/Profile";
import { Match } from "./types/sports";

const queryClient = new QueryClient();

type Screen = 'home' | 'match-details' | 'profile';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <Home 
            onMatchClick={handleMatchClick}
            onProfileClick={handleProfileClick}
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
          />
        );
      case 'profile':
        return <Profile onBack={handleBack} />;
      default:
        return (
          <Home 
            onMatchClick={handleMatchClick}
            onProfileClick={handleProfileClick}
          />
        );
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background">
          {renderScreen()}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
