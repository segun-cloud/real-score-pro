import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { CompetitionDetails } from "./pages/CompetitionDetails";
import { MatchDetails } from "./pages/MatchDetails";
import { Profile } from "./pages/Profile";
import { Leagues } from "./pages/Leagues";
import { Favourites } from "./pages/Favourites";
import { Feeds } from "./pages/Feeds";
import { FunHub } from "./pages/FunHub";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Onboarding } from "./pages/Onboarding";
import { Match } from "./types/sports";
import { BottomNavigation } from "./components/BottomNavigation";
import { Header } from "./components/Header";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
const queryClient = new QueryClient();
type Screen = 'matches' | 'match-details' | 'profile' | 'leagues' | 'favourites' | 'feeds' | 'fun-hub' | 'competition-details' | 'login' | 'signup' | 'onboarding';
const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('football');
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const {
    toast
  } = useToast();

  // Authentication state management
  useEffect(() => {
    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fetch user profile to get coins and onboarding status
        setTimeout(async () => {
          try {
            const {
              data: profile
            } = await supabase.from('user_profiles').select('coins, onboarding_completed').eq('id', session.user.id).single();
            if (profile) {
              setCoins(profile.coins);
              // Check if onboarding is needed
              if (currentScreen === 'login' || currentScreen === 'signup') {
                if (!profile.onboarding_completed) {
                  setCurrentScreen('onboarding');
                } else {
                  setCurrentScreen('matches');
                }
              }
            } else {
              // New user without profile yet
              if (currentScreen === 'login' || currentScreen === 'signup') {
                setCurrentScreen('onboarding');
              }
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            if (currentScreen === 'login' || currentScreen === 'signup') {
              setCurrentScreen('onboarding');
            }
          }
        }, 0);
      } else {
        setCoins(0);
        if (currentScreen !== 'login' && currentScreen !== 'signup') {
          setCurrentScreen('login');
        }
      }
      setIsLoadingAuth(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fetch user profile including onboarding status
        supabase.from('user_profiles').select('coins, onboarding_completed').eq('id', session.user.id).single().then(({
          data: profile
        }) => {
          if (profile) {
            setCoins(profile.coins);
            // Check if onboarding is needed
            if (!profile.onboarding_completed) {
              setCurrentScreen('onboarding');
            } else {
              setCurrentScreen('matches');
            }
          } else {
            // Profile doesn't exist yet (new user), show onboarding
            setCurrentScreen('onboarding');
          }
          setIsLoadingAuth(false);
        });
      } else {
        setIsLoadingAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Real-time coin updates
  const updateCoins = async () => {
    if (!user) return;
    try {
      const {
        data: profile
      } = await supabase.from('user_profiles').select('coins').eq('id', user.id).single();
      if (profile) {
        setCoins(profile.coins);
      }
    } catch (error) {
      console.error('Error updating coins:', error);
    }
  };
  const handleMatchClick = (match: Match) => {
    setSelectedMatchId(match.id);
    setSelectedMatch(match);
    setCurrentScreen('match-details');
  };
  const handleBack = () => {
    setCurrentScreen('matches');
    setSelectedMatchId(null);
    setSelectedMatch(null);
  };
  const handleNavigate = (screen: string, competitionId?: string) => {
    // Protect routes - require authentication
    if (!user && screen !== 'login' && screen !== 'signup') {
      toast({
        title: "Authentication required",
        description: "Please sign in to access this feature",
        variant: "destructive"
      });
      setCurrentScreen('login');
      return;
    }
    if (screen === 'competition-details' && competitionId) {
      setSelectedCompetitionId(competitionId);
    }
    setCurrentScreen(screen as Screen);
    setSelectedMatchId(null);
  };
  const handleProfileClick = () => {
    if (!user) {
      setCurrentScreen('login');
      return;
    }
    setCurrentScreen('profile');
  };
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentScreen('login');
    toast({
      title: "Logged out",
      description: "You've been logged out successfully"
    });
  };
  const renderScreen = () => {
    if (isLoadingAuth) {
      return <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>;
    }
    switch (currentScreen) {
      case 'login':
        return <Login onNavigateToSignup={() => setCurrentScreen('signup')} onLoginSuccess={() => {
          setCurrentScreen('matches');
          updateCoins();
        }} />;
      case 'signup':
        return <Signup onNavigateToLogin={() => setCurrentScreen('login')} onSignupSuccess={() => {
          // Will be handled by onAuthStateChange which checks onboarding status
        }} />;
      case 'onboarding':
        return user ? <Onboarding userId={user.id} onComplete={() => {
          setCurrentScreen('matches');
          updateCoins();
        }} /> : <Login onNavigateToSignup={() => setCurrentScreen('signup')} onLoginSuccess={() => {}} />;
      case 'matches':
        return <Home onMatchClick={handleMatchClick} selectedSport={selectedSport} />;
      case 'match-details':
        return selectedMatchId ? <MatchDetails matchId={selectedMatchId} match={selectedMatch || undefined} onBack={handleBack} onProfileClick={handleProfileClick} /> : <Home onMatchClick={handleMatchClick} selectedSport={selectedSport} />;
      case 'profile':
        return <Profile onBack={handleBack} coins={coins} onLogout={handleLogout} onCoinsUpdate={updateCoins} />;
      case 'leagues':
        return <Leagues />;
      case 'favourites':
        return <Favourites />;
      case 'feeds':
        return <Feeds />;
      case 'fun-hub':
        return <FunHub userId={user?.id} onCoinsUpdate={updateCoins} onNavigate={handleNavigate} />;
      case 'competition-details':
        return selectedCompetitionId ? <div className="min-h-screen bg-background pb-20">
            <CompetitionDetails competitionId={selectedCompetitionId} onBack={() => setCurrentScreen('fun-hub')} />
          </div> : <FunHub userId={user?.id} onCoinsUpdate={updateCoins} onNavigate={handleNavigate} />;
      default:
        return <Home onMatchClick={handleMatchClick} selectedSport={selectedSport} />;
    }
  };
  return <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f4f4]">
          <Toaster />
          <Sonner />
          {user && currentScreen !== 'login' && currentScreen !== 'signup' && currentScreen !== 'onboarding' && <>
              <Header coins={coins} onProfileClick={handleProfileClick} selectedSport={selectedSport} onSportChange={handleSportChange} userId={user?.id} />
            </>}
          <div className={`mx-auto w-full max-w-[480px] ${user && currentScreen !== 'login' && currentScreen !== 'signup' && currentScreen !== 'onboarding' ? 'pb-16' : ''}`}>
            {renderScreen()}
          </div>
          {user && currentScreen !== 'login' && currentScreen !== 'signup' && currentScreen !== 'onboarding' && <BottomNavigation activeScreen={currentScreen === 'match-details' ? 'matches' : currentScreen} onNavigate={handleNavigate} />}
        </div>
      </TooltipProvider>
    </QueryClientProvider>;
};
export default App;