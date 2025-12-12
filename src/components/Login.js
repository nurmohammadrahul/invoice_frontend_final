import React, { useState, useEffect } from 'react';
import api from '../api/config';
import './Login.css';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(null);

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const res = await api.get('/auth/check-admin-exists');
      setAdminExists(res.data.adminExists);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminExists(true);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', {
        username: formData.username,
        password: formData.password
      });

      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userData', JSON.stringify(user));

      onLogin({ token, user });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        setError(error.response?.data?.error || 'Invalid username or password');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">🧾</span>
            <h1>VQS Invoice System</h1>
          </div>
          <p className="welcome-text">
            Welcome! Please sign in to your account.
          </p>
          
          {adminExists === false && (
            <div className="info-message admin-notice">
              <strong>No Admin Account Found</strong>
              <p>Please register as the first administrator.</p>
            </div>
          )}
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && (
            <div className="status-message error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username *
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter username"
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password *
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="btn-spinner"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="switch-mode">
            {adminExists === false ? (
              <div className="admin-registration-prompt">
                <p className="no-admin-message">
                  ⚠️ No admin account exists
                </p>
                <button 
                  type="button"
                  onClick={onSwitchToRegister}
                  className="register-link-btn"
                  disabled={isLoading}
                >
                  Register as First Admin
                </button>
              </div>
            ) : adminExists === true ? (
              <p className="register-link">
                Need to create an account?{' '}
                <button 
                  type="button"
                  onClick={onSwitchToRegister}
                  className="switch-link"
                  disabled={isLoading}
                >
                  Register here
                </button>
              </p>
            ) : (
              <div className="loading-state-small">
                <div className="mini-spinner"></div>
                <p>Checking system...</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;