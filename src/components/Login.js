import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css'; // We'll create this CSS file
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: 'admin',
    password: 'admin123'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Initialize admin on component mount
  useEffect(() => {
    initializeAdmin();
  }, []);

  const initializeAdmin = async () => {
    try {
      setInitializing(true);
      const res = await axios.post(`${API_BASE_URL}/auth/init`);
      console.log('✅ System ready:', res.data.message);
    } catch (error) {
      console.log('ℹ️ System check:', error.response?.data?.error || 'Admin exists');
    } finally {
      setInitializing(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store auth data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);

      console.log('✅ Login successful');
      onLogin();
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please check your credentials.');
      console.error('❌ Login error:', error.response?.data);
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
          <p className="welcome-text">Welcome back! Please sign in to your account.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {initializing && (
            <div className="status-message info">
              <div className="spinner"></div>
              Initializing system...
            </div>
          )}

          {error && (
            <div className="status-message error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your username"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || initializing}
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
        </form>
      </div>
    </div>
  );
};

export default Login;