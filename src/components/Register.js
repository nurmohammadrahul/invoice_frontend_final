import React, { useState } from 'react';
import api from '../api/config';
import './Login.css';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register', {
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username,
        email: formData.email || ''
      });

      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userData', JSON.stringify(user));

      onRegister({ token, user });
    } catch (error) {
      if (error.response?.status === 400) {
        setError(error.response?.data?.error || 'Registration failed');
      } else if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError('Registration failed. Please try again.');
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
            Create your admin account
          </p>
          <p className="sub-text">
            This will create the first admin user for the system.
          </p>
        </div>

        <form className="login-form" onSubmit={handleRegister}>
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
              placeholder="Enter your full name"
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
              placeholder="Enter email address"
              disabled={isLoading}
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
              placeholder="Enter password (min. 6 characters)"
              disabled={isLoading}
              required
            />
          </div>

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
              placeholder="Confirm password"
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
                Creating Account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </button>

          <div className="switch-mode">
            <p className="register-link">
              Already have an account?{' '}
              <button 
                type="button"
                onClick={onSwitchToLogin}
                className="switch-link"
                disabled={isLoading}
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;