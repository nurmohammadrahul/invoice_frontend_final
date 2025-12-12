import React, { useState } from 'react';
import api from '../api/config';
import './ChangePassword.css';

function ChangePassword({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="change-password-container">
        <div className="change-password-card success">
          <div className="success-icon">✅</div>
          <h2>Password Changed Successfully!</h2>
          <p>You will be redirected shortly...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <div className="change-password-header">
          <h2>Change Password</h2>
          <p>Update your account password</p>
        </div>
        
        <form className="change-password-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Enter current password"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password (min 6 characters)"
              required
              minLength="6"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
          </div>
          
          <div className="button-group">
            <button 
              type="button" 
              onClick={onCancel}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Changing...
                </>
              ) : 'Change Password'}
            </button>
          </div>
        </form>
        
        <div className="password-tips">
          <h4>Password Tips:</h4>
          <ul>
            <li>Use at least 6 characters</li>
            <li>Include uppercase and lowercase letters</li>
            <li>Include numbers and special characters</li>
            <li>Don't use common words or personal information</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;