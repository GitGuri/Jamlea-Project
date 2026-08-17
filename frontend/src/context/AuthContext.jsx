import { createContext, useContext, useEffect, useState } from 'react';
import { loginRequest, registerRequest, getMeRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if we have a stored token, verify it's still valid by
  // fetching the profile. This is what keeps a customer logged in across
  // page refreshes.
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMeRequest()
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await loginRequest(email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, companyName, role, fullName) => {
    const { data } = await registerRequest(email, password, companyName, role, fullName);
    // A staff (sales_rep) signup lands as 'pending' -- there's no session to
    // log in with yet, it's awaiting admin approval. Only customer signups
    // (the default) get an immediate session.
    if (data.pending) {
      return { pending: true, message: data.message };
    }
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
