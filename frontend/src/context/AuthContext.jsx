import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext(null);

const defaultUser = {
  name: 'Sofia Ramirez',
  role: 'Compliance Lead',
  email: 'sofia.ramirez@company.com',
  permissions: [
    'dashboard.read',
    'user.read',
    'role.read',
    'permission.read',
    'department.read',
    'compliance.read',
    'reports.read',
    'notifications.read',
    'settings.read',
  ],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    try {
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const login = (userData, token, refreshToken, remember = true) => {
    const payload = { ...defaultUser, ...userData };
    localStorage.setItem('user', JSON.stringify(payload));
    localStorage.setItem('accessToken', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('rememberSession', remember ? 'true' : 'false');
    setUser(payload);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberSession');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAuthReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
