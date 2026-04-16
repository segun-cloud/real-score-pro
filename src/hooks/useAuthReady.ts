import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * useAuthReady — single source of truth for auth bootstrap.
 *
 * Returns `isReady = true` only after the initial session restore from storage
 * has completed. This prevents components from issuing RLS-protected queries
 * before Supabase knows who the user is (which would silently fail).
 *
 * Subscribes to onAuthStateChange so user/session always reflect reality.
 */
export const useAuthReady = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Set up listener FIRST (synchronously) so we never miss an event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLastEvent(event);
      // Once we've received any event, we're ready.
      setIsReady(true);
    });

    // 2. Then ask for the existing session.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      setSession(existing);
      setUser(existing?.user ?? null);
      setIsReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, isReady, lastEvent };
};
