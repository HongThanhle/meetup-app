import React, { createContext, useState, useEffect, useContext } from 'react';
import { loadAuth, saveAuth, clearAuth } from '../services/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // đang đọc token đã lưu chưa

  // Khi app mở lên, tự đọc token đã lưu trước đó (nếu có) để không phải đăng nhập lại
  useEffect(() => {
    (async () => {
      const { token: savedToken, user: savedUser } = await loadAuth();
      if (savedToken) {
        setToken(savedToken);
        setUser(savedUser);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (newToken, newUser) => {
    await saveAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await clearAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
