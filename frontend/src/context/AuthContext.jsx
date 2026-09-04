import React, { createContext, useContext, useState, useEffect } from 'react';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import OrbitLoader from '../components/OrbitLoader';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase ID token changes (handles sign-in, sign-out, and auto-refresh)
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('token', token);
          
          // Try to recover cached user profile payload
          const cachedUser = localStorage.getItem('user');
          const userData = cachedUser ? JSON.parse(cachedUser) : {
            email: firebaseUser.email,
            username: firebaseUser.email ? firebaseUser.email.split('@')[0] : `user_${firebaseUser.uid.slice(0, 5)}`,
            firebaseUid: firebaseUser.uid
          };
          
          setUser(userData);
          socketService.connect(token);
        } catch (err) {
          console.error("Error setting Firebase user token:", err);
        }
      } else {
        // User is logged out
        const token = localStorage.getItem('token');
        const cachedUser = localStorage.getItem('user');
        
        if (token && token !== 'mock_token' && cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            socketService.connect(token);
          } catch (e) {
            setUser(null);
            socketService.disconnect();
          }
        } else {
          setUser(null);
          socketService.disconnect();
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData, token) => {
    if (token) localStorage.setItem('token', token);
    if (userData) localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (token) socketService.connect(token);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase signout error:", err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    socketService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {loading ? <OrbitLoader fullScreen message="Entering Orbit..." /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

