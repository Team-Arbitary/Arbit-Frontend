import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: User) => void;
  logout: (message?: string) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global logout function that can be called from anywhere (like axios interceptors)
let globalLogout: ((message?: string) => void) | null = null;

export const getGlobalLogout = () => globalLogout;
export const setGlobalLogout = (fn: ((message?: string) => void) | null) => {
  globalLogout = fn;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const logout = (message?: string) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    
    // Store the logout message to show on login page
    if (message) {
      sessionStorage.setItem("logoutMessage", message);
    }
    
    // Redirect to login
    window.location.href = "/login";
  };

  // Set global logout function
  useEffect(() => {
    setGlobalLogout(logout);
    return () => setGlobalLogout(null);
  }, []);

  const login = (newToken: string, newUser?: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  // Check token validity on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // Try to load cached user
      try {
        const cachedUser = localStorage.getItem("user");
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Validate token by checking if it's expired (for JWT)
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const isExpired = payload.exp && payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          logout("Your session has expired. Please login again.");
          return;
        }
      } catch (e) {
        // Token format invalid or not a JWT - let API calls handle validation
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
