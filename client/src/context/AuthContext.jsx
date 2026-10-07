import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("festive_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("festive_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  const saveSession = useCallback((payload) => {
    localStorage.setItem("festive_token", payload.token);
    localStorage.setItem("festive_user", JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const { data } = await apiClient.post("/auth/login", credentials);
      if (data.token) {
        saveSession(data);
      }
      return data;
    },
    [saveSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await apiClient.post("/auth/register", payload);
      if (data.token) {
        saveSession(data);
      }
      return data;
    },
    [saveSession]
  );

  const loginWithFirebaseIdToken = useCallback(
    async (idToken) => {
      const { data } = await apiClient.post("/auth/firebase-login", { idToken });
      saveSession(data);
      return data;
    },
    [saveSession]
  );

  const verifyLoginOtp = useCallback(
    async (payload) => {
      const { data } = await apiClient.post("/auth/login/verify-otp", payload);
      saveSession(data);
      return data.user;
    },
    [saveSession]
  );

  const verifyEmail = useCallback(async (payload) => {
    const { data } = await apiClient.post("/auth/verify-email", payload);
    return data;
  }, []);

  const resendVerificationOtp = useCallback(async (email) => {
    const { data } = await apiClient.post("/auth/send-verification-otp", { email });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("festive_token");
    localStorage.removeItem("festive_user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get("/auth/profile");
        if (!cancelled) {
          setUser(data.user);
          localStorage.setItem("festive_user", JSON.stringify(data.user));
        }
      } catch (_error) {
        logout();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    refresh();

    return () => {
      cancelled = true;
    };
  }, [logout, token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      loginWithFirebaseIdToken,
      verifyLoginOtp,
      verifyEmail,
      resendVerificationOtp,
      logout
    }),
    [loading, login, loginWithFirebaseIdToken, logout, register, resendVerificationOtp, token, user, verifyEmail, verifyLoginOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
