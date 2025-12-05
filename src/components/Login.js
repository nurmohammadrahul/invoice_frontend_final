import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://invoice-backend-final.vercel.app';

const Login = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);

  // Check if admin exists on component mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}api/auth/check-admin`);
      setAdminExists(res.data.adminExists);
      
      // If no admin exists, show registration form
      if (!res.data.adminExists) {
        setIsRegisterMode(true);
      }
    } catch (error) {
      console.log('Error checking admin status:', error.message);
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
      const res = await axios.post(`${API_BASE_URL}api/auth/login`, {
        username: formData.username,
        password: formData.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store auth data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userData', JSON.stringify({
        username: res.data.username,
        name: res.data.name,
        role: res.data.role,
        userId: res.data.userId
      }));

      console.log('✅ Login successful');
      onLogin(res.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please check your credentials.');
      console.error('❌ Login error:', error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError('All required fields must be filled');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}api/auth/register`, {
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username,
        email: formData.email || `${formData.username}@vqs.com`
      });

      // Auto login after successful registration
      const loginRes = await axios.post(`${API_BASE_URL}api/auth/login`, {
        username: formData.username,
        password: formData.password
      });

      // Store auth data
      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('userData', JSON.stringify({
        username: loginRes.data.username,
        name: loginRes.data.name,
        role: loginRes.data.role,
        userId: loginRes.data.userId
      }));

      console.log('✅ Registration and login successful');
      onLogin(loginRes.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
      console.error('❌ Registration error:', error.response?.data);
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
            {isRegisterMode 
              ? 'Create Admin Account' 
              : 'Welcome back! Please sign in to your account.'}
          </p>
        </div>

        <form className="login-form" onSubmit={isRegisterMode ? handleRegister : handleLogin}>
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
            />
          </div>

          {isRegisterMode && (
            <>
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Your full name"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

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
              placeholder={isRegisterMode ? "Minimum 6 characters" : "Enter password"}
              disabled={isLoading}
              required
            />
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Confirm your password"
                disabled={isLoading}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="btn-spinner"></div>
                {isRegisterMode ? 'Registering...' : 'Signing In...'}
              </>
            ) : (
              isRegisterMode ? 'Register Admin' : 'Sign In'
            )}
          </button>

          <div className="switch-mode">
            {isRegisterMode ? (
              <p>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="switch-link"
                  disabled={isLoading}
                >
                  Login here
                </button>
              </p>
            ) : adminExists ? (
              <p>
                Need to register?{' '}
                <button 
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="switch-link"
                  disabled={isLoading}
                >
                  Register here
                </button>
              </p>
            ) : (
              <div className="admin-note">
                <h4>No Admin Account Found</h4>
                <p>Please register as the first admin user.</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;