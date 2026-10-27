import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Initialisation : charge les informations de l'utilisateur à partir du token stocké
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.data.user);
        } catch (error) {
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (name, email, password) => {
    const res = await authService.register(name, email, password);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await authService.getMe();
        setUser(res.data.user);
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du profil:', error);
      }
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isChefDeProjet = user?.role === 'CHEF_DE_PROJET';
  const canCreateProject = isAdmin || isChefDeProjet;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isChefDeProjet,
        canCreateProject,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider');
  }
  return context;
}
