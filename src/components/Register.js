import React, { useState } from 'react';
import api from '../api/config';
import './Register.css';

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
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

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username,
        email: formData.email || `${formData.username}@vqs.com`
      });

      setSuccess(true);
      
      setTimeout(async () => {
        try {
          const loginResponse = await api.post('/auth/login', {
            username: formData.username,
            password: formData.password
          });

          const { token, user } = loginResponse.data;
          localStorage.setItem('token', token);
          localStorage.setItem('userData', JSON.stringify(user));
          onRegister({ token, user });
        } catch (loginError) {
          onSwitchToLogin();
        }
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card success">
          <div className="success-icon">✅</div>
          <h2>Registration Successful!</h2>
          <p>Admin account created successfully.</p>
          <p>Logging you in automatically...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="logo">
            <span className="logo-icon">👑</span>
            <h1>Admin Registration</h1>
          </div>
          <p className="register-subtitle">Create your admin account</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
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
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Choose a username"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="Your full name"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="your.email@example.com"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Minimum 6 characters"
              required
              minLength="6"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={`register-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                Registering...
              </>
            ) : (
              'Register Admin'
            )}
          </button>

          <div className="switch-link">
            <p>Already have an account? <button 
              type="button" 
              onClick={onSwitchToLogin}
              className="link-btn"
              disabled={loading}
            >
              Login here
            </button></p>
          </div>

          <div className="admin-note">
            <h4>Important Note:</h4>
            <p>Only one admin account can be created. If an admin already exists, you must login instead.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;