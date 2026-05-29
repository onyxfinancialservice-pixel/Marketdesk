import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

async function ensureUserBootstrap(user) {
  if (!user?.id) return;
  await supabase.from("user_settings").upsert({
    user_id: user.id,
    default_timeframe: "1h",
    default_market: "crypto",
    theme: "light",
  }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: lists } = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (!lists || lists.length === 0) {
    await supabase.from("watchlists").insert({ user_id: user.id, name: "My Watchlist" });
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) ensureUserBootstrap(data.session.user).catch(() => {});
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) ensureUserBootstrap(sess.user).catch(() => {});
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    if (data.user) await ensureUserBootstrap(data.user);
  };
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    if (data.user) await ensureUserBootstrap(data.user);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
