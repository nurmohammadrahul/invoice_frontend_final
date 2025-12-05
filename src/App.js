import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import ChangePassword from './components/ChangePassword';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUserInfo(JSON.parse(userData));
    }
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
    // After registration, automatically login
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
    // Trigger refresh of invoice list
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePasswordChangeSuccess = () => {
    alert('Password changed successfully!');
    setCurrentView('list');
  };

  // If not authenticated, show login/register
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
      {/* Header */}
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
      
      {/* Navigation */}
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

      {/* Main Content */}
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

      {/* Footer */}
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} VQS Invoice System. All rights reserved.</p>
        <p className="footer-version">Version 1.0.0</p>
      </footer>
    </div>
  );
}

export default App;