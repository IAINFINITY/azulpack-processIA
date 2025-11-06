
import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'ADMIN' | 'USER';

export interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  nome: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  logAuditEvent: (actionType: string, resourceType: string, resourceId?: string, details?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return null;
    }
  };

  const logAuditEvent = async (actionType: string, resourceType: string, resourceId?: string, details?: any) => {
    if (!user) return;

    try {
      await supabase.rpc('log_audit_event', {
        p_action_type: actionType,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details
      });
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
          
          // Registrar login
          if (event === 'SIGNED_IN') {
            await logAuditEvent('LOGIN', 'SYSTEM');
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Registrar logout no audit log antes de deslogar
      if (user) {
        await logAuditEvent('LOGOUT', 'SYSTEM');
      }
      
      // Fazer logout do Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro ao deslogar do Supabase:', error);
        throw error;
      }
      
      // Limpar estado local
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
    } catch (error) {
      console.error('Erro no processo de logout:', error);
      throw error;
    }
  };

  const isAdmin = userProfile?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userProfile, 
      loading, 
      isAdmin,
      signOut,
      logAuditEvent
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
