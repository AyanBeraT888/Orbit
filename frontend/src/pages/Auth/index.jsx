import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { auth, googleProvider, facebookProvider } from '../../services/firebase';
import { signInWithPopup } from "firebase/auth";
import { authAPI } from '../../services/api';
import './Auth.css';

const Auth = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const response = await authAPI.googleLogin(idToken);
      localStorage.setItem('token', idToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.reload();
    } catch (err) {
      console.error("GOOGLE SIGN-IN ERROR:", err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const idToken = await result.user.getIdToken();
      const response = await authAPI.facebookLogin(idToken);
      localStorage.setItem('token', idToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.reload();
    } catch (err) {
      console.error("FACEBOOK SIGN-IN ERROR:", err);
      setError(err.message || 'Facebook Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-visuals">
        <div className="orb-glow"></div>
        <div className="orb-glow secondary"></div>
        <div className="content">
          <h1>Orb</h1>
          <p>Private real-time location sharing with your inner circle.</p>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card glass-morphism animate-fade-in">
          <h2>Welcome to Orb</h2>
          <p className="subtitle">Sign in with your social account to continue</p>

          {error && <div className="error-message"><AlertCircle size={16} /> {error}</div>}

          <div className="choice-container">
            <button className="choice-btn google" onClick={handleGoogleSignIn} disabled={loading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              <span>Continue with Google</span>
            </button>

            <button className="choice-btn facebook" onClick={handleFacebookSignIn} disabled={loading}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
