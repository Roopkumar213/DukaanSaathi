import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, AuthResponse, UserDto, LoginPayload, RegisterPayload } from '../api/authApi';

interface AuthContextType {
  token: string | null;
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('dukaanai_token'));
  const [user, setUser] = useState<UserDto | null>(() => {
    const saved = localStorage.getItem('dukaanai_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const me = await authApi.getMe();
          setUser(me);
          localStorage.setItem('dukaanai_user', JSON.stringify(me));
        } catch (e) {
          console.error('Session expired or invalid token', e);
          setToken(null);
          setUser(null);
          localStorage.removeItem('dukaanai_token');
          localStorage.removeItem('dukaanai_user');
        }
      }
      setIsLoading(false);
    }
    checkAuth();
  }, [token]);

  const handleAuthSuccess = (res: AuthResponse) => {
    setToken(res.token);
    const userDto: UserDto = {
      id: res.userId,
      email: res.email,
      fullName: res.fullName,
      shopId: res.shopId,
      shopName: res.shopName,
    };
    setUser(userDto);
    localStorage.setItem('dukaanai_token', res.token);
    localStorage.setItem('dukaanai_user', JSON.stringify(userDto));
  };

  const login = async (data: LoginPayload) => {
    const res = await authApi.login(data);
    handleAuthSuccess(res);
  };

  const register = async (data: RegisterPayload) => {
    const res = await authApi.register(data);
    handleAuthSuccess(res);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dukaanai_token');
    localStorage.removeItem('dukaanai_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
