import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setAuthToken, removeAuthToken, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; role?: string; phone?: string }) => Promise<void>;
  logout: () => void | Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserMe(): Promise<User | null> {
  try {
    const u = await authAPI.me();
    return u ? { id: u.id, fullName: u.fullName, email: u.email, role: u.role } : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      // Try to decode JWT to get user info (basic check)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired, remove it
          removeAuthToken();
          setUser(null);
        } else {
          fetchUserMe().then(setUser).catch(() => { removeAuthToken(); setUser(null); });
        }
      } catch (err) {
        // Invalid token, remove it
        removeAuthToken();
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    setAuthToken(response.accessToken);
    setUser(response.user);
  };

  const signup = async (data: { name: string; email: string; password: string; role?: string; phone?: string }) => {
    const response = await authAPI.signup(data);
    setAuthToken(response.accessToken);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      removeAuthToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
