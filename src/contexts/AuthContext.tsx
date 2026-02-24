import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "manager" | "individual";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  displayName: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  displayName: "",
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (!initialSession?.user) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error checking auth session:", error);
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (!newSession?.user) {
          setRole(null);
          setDisplayName("");
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async () => {
      if (!user) return;

      try {
        const [{ data: roleData }, { data: profileData }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
          supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        ]);

        if (mounted) {
          if (roleData) setRole(roleData.role);
          if (profileData) setDisplayName(profileData.display_name);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, displayName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
