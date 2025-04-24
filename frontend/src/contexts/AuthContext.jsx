import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [email, setEmail] = useState(localStorage.getItem('email') || null);
  const [name, setName] = useState(localStorage.getItem('name') || null);

  // Save auth data when updated
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);
      localStorage.setItem('name', name);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      localStorage.removeItem('name');
    }
  }, [token, email, name]);

  // Login function
  const login = (newToken, newEmail, newName) => {
    setToken(newToken);
    setEmail(newEmail);
    setName(newName);
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setEmail(null);
    setName(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, name, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};