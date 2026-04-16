import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useFavoriteNotifications } from "@/hooks/useFavoriteNotifications";
import { useAuthReady } from "@/hooks/useAuthReady";

const queryClient = new QueryClient();

type Screen = 'matches' | 'match-details' | 'profile' | 'leagues' | 'favourites' | 'feeds' | 'fun-hub' | 'competition-details' | 'login' | 'signup' | 'onboarding' | 'update-password';

// Screens accessible to guests (unauthenticated users)
const GUEST_ACCESSIBLE_SCREENS: Screen[] = ['matches', 'match-details', 'feeds', 'leagues'];

const isStandaloneNow = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('matches');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('football');
  const [coins, setCoins] = useState(0);
  const [showA2HS, setShowA2HS] = useState(false);
  const { toast } = useToast();
  const { user, isReady, lastEvent } = useAuthReady();
  const profileFetchedForUserId = useRef<string | null>(null);

  // Subscribe to favorite notifications for logged-in users
  useFavoriteNotifications(user?.id);

  // Detect password recovery via URL hash (Supabase puts type=recovery in the URL fragment)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || window.location.pathname === "/reset-password") {
      setCurrentScreen("update-password");
    }
  }, []);

  // React to PASSWORD_RECOVERY event
  useEffect(() => {
    if (lastEvent === "PASSWORD_RECOVERY") {
      setCurrentScreen("update-password");
    }
  }, [lastEvent]);

  // Add to Home Screen guide — re-check standalone every load
  useEffect(() => {
    if (isStandaloneNow()) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem("a2hs_dismissed");
    if (isMobile && !dismissed) {
      const timer = setTimeout(() => setShowA2HS(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismissA2HS = () => {
    setShowA2HS(false);
    localStorage.setItem("a2hs_dismissed", "1");
  };

  // Once auth is ready, fetch profile + decide initial routing.
  useEffect(() => {
    if (!isReady) return;

    // No user: route guests to matches if they're stranded on a protected screen.
    if (!user) {
      setCoins(0);
      profileFetchedForUserId.current = null;
      setCurrentScreen((prev) => {
        if (
          prev === "login" ||
          prev === "signup" ||
          prev === "update-password" ||
          GUEST_ACCESSIBLE_SCREENS.includes(prev)
        ) {
          return prev;
        }
        return "matches";
      });
      return;
    }

    // User exists. Skip if we've already fetched profile for this user.
    if (profileFetchedForUserId.current === user.id) return;
    profileFetchedForUserId.current = user.id;

    (async () => {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("coins, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setCoins(profile.coins);
          setCurrentScreen((prev) => {
            // Stay on update-password during password reset.
            if (prev === "update-password") return prev;
            // After login/signup, route based on onboarding.
            if (prev === "login" || prev === "signup") {
              return profile.onboarding_completed ? "matches" : "onboarding";
            }
            return prev;
          });
        } else {
          // New user without profile — onboard.
          setCurrentScreen((prev) => {
            if (prev === "update-password") return prev;
            if (prev === "login" || prev === "signup" || GUEST_ACCESSIBLE_SCREENS.includes(prev)) {
              return "onboarding";
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("[App] Error fetching profile:", error);
      }
    })();
  }, [isReady, user]);

  // Real-time coin updates
  const updateCoins = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('coins')
        .eq('id', user.id)
        .maybeSingle();
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
    if (!isReady) {
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
              // Profile/onboarding routing handled by the isReady/user effect.
              updateCoins();
            }}
          />
        );
      case 'signup':
        return (
          <Signup
            onNavigateToLogin={() => setCurrentScreen('login')}
            onSignupSuccess={() => {
              // Routing handled by the isReady/user effect.
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
          {showA2HS && <AddToHomeScreenGuide onDismiss={handleDismissA2HS} />}
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
