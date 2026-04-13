import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { AddToHomeScreenGuide } from "./components/AddToHomeScreenGuide";
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
import { UpdatePassword } from "./pages/UpdatePassword";
import { Match } from "./types/sports";
import { BottomNavigation } from "./components/BottomNavigation";
import { Header } from "./components/Header";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteNotifications } from "@/hooks/useFavoriteNotifications";

const queryClient = new QueryClient();

type Screen = 'matches' | 'match-details' | 'profile' | 'leagues' | 'favourites' | 'feeds' | 'fun-hub' | 'competition-details' | 'login' | 'signup' | 'onboarding' | 'update-password';

// Screens accessible to guests (unauthenticated users)
const GUEST_ACCESSIBLE_SCREENS: Screen[] = ['matches', 'match-details', 'feeds', 'leagues'];

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('matches');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('football');
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { toast } = useToast();

  // Subscribe to favorite notifications for logged-in users
  useFavoriteNotifications(user?.id);

  // Authentication state management
  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle password recovery event
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentScreen('update-password');
        setIsLoadingAuth(false);
        return;
      }
      
      if (session?.user) {
        // Don't redirect if updating password
        if (currentScreen === 'update-password') {
          setIsLoadingAuth(false);
          return;
        }
        
        // Fetch user profile to get coins and onboarding status
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('coins, onboarding_completed')
              .eq('id', session.user.id)
              .single();
              
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
        // For guests, redirect to matches (scores view) instead of login
        if (!GUEST_ACCESSIBLE_SCREENS.includes(currentScreen) && 
            currentScreen !== 'login' && 
            currentScreen !== 'signup' && 
            currentScreen !== 'update-password') {
          setCurrentScreen('matches');
        }
      }
      setIsLoadingAuth(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fetch user profile including onboarding status
        supabase
          .from('user_profiles')
          .select('coins, onboarding_completed')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
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
        // Guest user - show matches by default
        setCurrentScreen('matches');
        setIsLoadingAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Real-time coin updates
  const updateCoins = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', user.id)
        .single();
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
    // Check if the screen requires authentication
    const screenAsType = screen as Screen;
    const requiresAuth = !GUEST_ACCESSIBLE_SCREENS.includes(screenAsType) && 
                         screen !== 'login' && 
                         screen !== 'signup';

    if (!user && requiresAuth) {
      toast({
        title: "Sign up to access this feature",
        description: "Create a free account to save favorites, join competitions, and get notifications",
        variant: "default"
      });
      setCurrentScreen('signup');
      return;
    }

    if (screen === 'competition-details' && competitionId) {
      setSelectedCompetitionId(competitionId);
    }
    setCurrentScreen(screenAsType);
    setSelectedMatchId(null);
  };

  const handleFunHubClick = () => {
    if (!user) {
      toast({
        title: "Sign up to access FunHub",
        description: "Create teams, join competitions, and win prizes!",
        variant: "default"
      });
      setCurrentScreen('signup');
      return;
    }
    setCurrentScreen('fun-hub');
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentScreen('matches');
    toast({
      title: "Logged out",
      description: "You've been logged out successfully"
    });
  };

  const handleGuestLogin = () => {
    setCurrentScreen('login');
  };

  const handleGuestSignup = () => {
    setCurrentScreen('signup');
  };

  const renderScreen = () => {
    if (isLoadingAuth) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'login':
        return (
          <Login
            onNavigateToSignup={() => setCurrentScreen('signup')}
            onLoginSuccess={() => {
              setCurrentScreen('matches');
              updateCoins();
            }}
          />
        );
      case 'signup':
        return (
          <Signup
            onNavigateToLogin={() => setCurrentScreen('login')}
            onSignupSuccess={() => {
              // Will be handled by onAuthStateChange which checks onboarding status
            }}
          />
        );
      case 'update-password':
        return (
          <UpdatePassword
            onSuccess={() => {
              setCurrentScreen('matches');
              updateCoins();
            }}
          />
        );
      case 'onboarding':
        return user ? (
          <Onboarding
            userId={user.id}
            onComplete={() => {
              setCurrentScreen('matches');
              updateCoins();
            }}
          />
        ) : (
          <Login onNavigateToSignup={() => setCurrentScreen('signup')} onLoginSuccess={() => {}} />
        );
      case 'matches':
        return (
          <Home
            onMatchClick={handleMatchClick}
            selectedSport={selectedSport}
            isGuest={!user}
            onGuestLogin={handleGuestLogin}
            onGuestSignup={handleGuestSignup}
          />
        );
      case 'match-details':
        return selectedMatchId ? (
          <MatchDetails
            matchId={selectedMatchId}
            match={selectedMatch || undefined}
            onBack={handleBack}
            onFunHubClick={handleFunHubClick}
          />
        ) : (
          <Home
            onMatchClick={handleMatchClick}
            selectedSport={selectedSport}
            isGuest={!user}
            onGuestLogin={handleGuestLogin}
            onGuestSignup={handleGuestSignup}
          />
        );
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
        return selectedCompetitionId ? (
          <div className="min-h-screen bg-background pb-20">
            <CompetitionDetails competitionId={selectedCompetitionId} onBack={() => setCurrentScreen('fun-hub')} />
          </div>
        ) : (
          <FunHub userId={user?.id} onCoinsUpdate={updateCoins} onNavigate={handleNavigate} />
        );
      default:
        return (
          <Home
            onMatchClick={handleMatchClick}
            selectedSport={selectedSport}
            isGuest={!user}
            onGuestLogin={handleGuestLogin}
            onGuestSignup={handleGuestSignup}
          />
        );
    }
  };

  // Determine if we should show header and navigation
  const showHeaderAndNav = currentScreen !== 'login' && 
                           currentScreen !== 'signup' && 
                           currentScreen !== 'onboarding' &&
                           currentScreen !== 'update-password';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen w-full overflow-x-hidden bg-background">
          <Toaster />
          <Sonner />
          {showHeaderAndNav && (
            <Header
              coins={user ? coins : 0}
              onFunHubClick={handleFunHubClick}
              selectedSport={selectedSport}
              onSportChange={handleSportChange}
              userId={user?.id}
              isGuest={!user}
              onGuestLogin={handleGuestLogin}
            />
          )}
          <div className={`mx-auto w-full max-w-[480px] ${showHeaderAndNav ? 'pb-16' : ''}`}>
            {renderScreen()}
          </div>
          {showHeaderAndNav && (
            <BottomNavigation
              activeScreen={currentScreen === 'match-details' ? 'matches' : currentScreen}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;