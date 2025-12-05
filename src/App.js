import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import ChangePassword from './components/ChangePassword';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://invoice-backend-final.vercel.app';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUserInfo(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUserInfo(userData);
    setCurrentView('list');
    setShowRegister(false);
    
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const handleRegister = (userData) => {
    handleLogin(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setCurrentView('list');
    setSelectedInvoice(null);
    setUserInfo(null);
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

  if (isLoading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register 
        onRegister={handleRegister} 
        onSwitchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>VQS Invoice System</h1>
          {userInfo && (
            <div className="user-info">
              <span className="user-name">Welcome, {userInfo.name || userInfo.username}</span>
              <span className="user-role">({userInfo.role})</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <button 
            onClick={() => setCurrentView('change-password')} 
            className="change-password-btn"
          >
            🔐 Change Password
          </button>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </header>
      
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentView('list')} 
          className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
        >
          📋 Invoice List
        </button>
        <button 
          onClick={handleNewInvoice}
          className={`nav-btn ${currentView === 'form' ? 'active' : ''}`}
        >
          ➕ Create Invoice
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
}

export default App;