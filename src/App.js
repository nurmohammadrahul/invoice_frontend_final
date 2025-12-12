import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import ChangePassword from './components/ChangePassword';
import api from './api/config';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
      setIsLoading(false);
      return;
    }

    setIsCheckingAuth(true);
    
    try {
      // Verify token is still valid by checking admin status
      const response = await api.get('/auth/check-admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.isAdmin) {
        setIsAuthenticated(true);
        setUserInfo(JSON.parse(userData));
      } else {
        // Token is invalid or user is not admin
        clearAuthData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUserInfo(null);
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUserInfo(userData.user || userData);
    setCurrentView('list');
    setShowRegister(false);
    
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userData', JSON.stringify(userData.user || userData));
  };

  const handleRegister = (userData) => {
    handleLogin(userData);
  };

  const handleLogout = () => {
    clearAuthData();
    setCurrentView('list');
    setSelectedInvoice(null);
    setShowRegister(false);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setCurrentView('form');
  };

  const handleNewInvoice = () => {
    setSelectedInvoice(null);
    setCurrentView('form');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedInvoice(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePasswordChangeSuccess = () => {
    alert('Password changed successfully!');
    setCurrentView('list');
  };

  const renderLoading = () => (
    <div className="loading-fullscreen">
      <div className="spinner"></div>
      <p>{isCheckingAuth ? 'Checking authentication...' : 'Loading...'}</p>
    </div>
  );

  const renderAuth = () => {
    if (showRegister) {
      return (
        <Register 
          onRegister={handleRegister} 
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }
    
    return (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  };

  const renderAuthenticatedApp = () => (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>VQS Invoice System</h1>
          {userInfo && (
            <div className="user-info">
              <span className="user-name">Welcome, {userInfo.name || userInfo.username}</span>
              <span className="user-role badge">{userInfo.role}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <button 
            onClick={() => setCurrentView('change-password')} 
            className="btn btn-secondary"
            title="Change your password"
          >
            <span className="btn-icon">🔐</span>
            Change Password
          </button>
          <button 
            onClick={handleLogout} 
            className="btn btn-danger"
            title="Logout from the system"
          >
            <span className="btn-icon">🚪</span>
            Logout
          </button>
        </div>
      </header>
      
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentView('list')} 
          className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
        >
          <span className="nav-icon">📋</span>
          Invoice List
        </button>
        <button 
          onClick={handleNewInvoice}
          className={`nav-btn ${currentView === 'form' ? 'active' : ''}`}
        >
          <span className="nav-icon">➕</span>
          Create Invoice
        </button>
      </nav>

      <main className="app-main">
        {currentView === 'list' && (
          <InvoiceList 
            onEditInvoice={handleEditInvoice}
            refreshTrigger={refreshTrigger}
          />
        )}
        
        {currentView === 'form' && (
          <InvoiceForm 
            invoice={selectedInvoice} 
            onBack={handleBackToList}
            onSuccess={handleBackToList}
          />
        )}
        
        {currentView === 'change-password' && (
          <ChangePassword 
            onSuccess={handlePasswordChangeSuccess}
            onCancel={() => setCurrentView('list')}
          />
        )}
      </main>
    </div>
  );

  if (isLoading || isCheckingAuth) {
    return renderLoading();
  }

  return isAuthenticated ? renderAuthenticatedApp() : renderAuth();
}

export default App;