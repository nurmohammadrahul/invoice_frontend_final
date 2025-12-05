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
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check if admin exists on component mount
  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      setIsCheckingAdmin(true);
      console.log('🔍 Checking if admin exists...');
      
      const res = await axios.get(`${API_BASE_URL}/api/auth/check-admin-exists`);
      console.log('Admin exists response:', res.data);
      
      setAdminExists(res.data.adminExists);
      
      // If no admin exists, show registration form
      if (!res.data.adminExists) {
        setIsRegisterMode(true);
      } else {
        setIsRegisterMode(false);
      }
    } catch (error) {
      console.error('❌ Error checking admin status:', error.message);
      console.error('Full error:', error);
      
      // Default to showing login form if check fails
      setAdminExists(true);
      setIsRegisterMode(false);
      
      // If it's a network error, show helpful message
      if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your internet connection and ensure the backend is running.');
      }
    } finally {
      setIsCheckingAdmin(false);
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
      console.log('🔐 Attempting login for user:', formData.username);
      
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username: formData.username,
        password: formData.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Login successful:', res.data);

      // Store auth data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userData', JSON.stringify({
        username: res.data.username,
        name: res.data.name,
        role: res.data.role,
        userId: res.data.userId
      }));

      // Verify the token works by checking admin status
      try {
        const adminCheckRes = await axios.get(`${API_BASE_URL}/api/auth/check-admin`, {
          headers: {
            'Authorization': `Bearer ${res.data.token}`
          }
        });
        console.log('✅ Admin status verified:', adminCheckRes.data);
      } catch (verifyError) {
        console.warn('⚠️ Could not verify admin status, but login succeeded:', verifyError.message);
      }

      onLogin(res.data);
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      if (error.response?.status === 401 || error.response?.status === 400) {
        setError(error.response?.data?.error || 'Invalid username or password. Please try again.');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError('Login failed. Please try again.');
      }
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
      console.log('📝 Attempting admin registration for user:', formData.username);
      
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username,
        email: formData.email || `${formData.username}@vqs.com`
      });

      console.log('✅ Registration successful:', res.data);

      // Auto login after successful registration
      const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username: formData.username,
        password: formData.password
      });

      console.log('✅ Auto-login successful:', loginRes.data);

      // Store auth data
      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('userData', JSON.stringify({
        username: loginRes.data.username,
        name: loginRes.data.name,
        role: loginRes.data.role,
        userId: loginRes.data.userId
      }));

      onLogin(loginRes.data);
    } catch (error) {
      console.error('❌ Registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      if (error.response?.status === 400) {
        setError(error.response?.data?.error || 'Registration failed. Please check your inputs.');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking admin status
  if (isCheckingAdmin) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Checking system status...</p>
          </div>
        </div>
      </div>
    );
  }

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
              ? adminExists 
                ? 'Register New User' 
                : 'Create First Admin Account'
              : 'Welcome back! Please sign in to your account.'}
          </p>
        </div>

        <form className="login-form" onSubmit={isRegisterMode ? handleRegister : handleLogin}>
          {error && (
            <div className="status-message error">
              ⚠️ {error}
            </div>
          )}

          {isRegisterMode && !adminExists && (
            <div className="info-message">
              ℹ️ You are registering as the first administrator. Make sure to remember your credentials.
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

          {isRegisterMode && (
            <>
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name (Optional)
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
                  Email (Optional)
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
            disabled={isLoading || isCheckingAdmin}
          >
            {isLoading ? (
              <>
                <div className="btn-spinner"></div>
                {isRegisterMode ? 'Registering...' : 'Signing In...'}
              </>
            ) : (
              isRegisterMode ? (adminExists ? 'Register' : 'Create Admin Account') : 'Sign In'
            )}
          </button>

          <div className="switch-mode">
            {isRegisterMode ? (
              <p>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError('');
                  }}
                  className="switch-link"
                  disabled={isLoading || isCheckingAdmin}
                >
                  Login here
                </button>
              </p>
            ) : adminExists ? (
              <p>
                Need to register a new user?{' '}
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError('');
                  }}
                  className="switch-link"
                  disabled={isLoading || isCheckingAdmin}
                >
                  Register here
                </button>
              </p>
            ) : (
              <div className="admin-note">
                <h4>⚠️ No Admin Account Found</h4>
                <p>Please register as the first administrator.</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;