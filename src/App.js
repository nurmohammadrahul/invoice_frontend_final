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
  const [showLogin, setShowLogin] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUserInfo(JSON.parse(userData));
      
      // Check if admin exists
      checkAdminStatus();
    } else {
      checkAdminStatus();
    }
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://invoice-backend-final.vercel.app'}/api/auth/check-admin`);
      const data = await response.json();
      
      // If no admin exists, show registration
      if (!data.adminExists) {
        setShowLogin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUserInfo(userData);
    setCurrentView('list');
    setShowLogin(true);
    
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
    checkAdminStatus();
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
  };

  const handlePasswordChangeSuccess = () => {
    alert('Password changed successfully!');
    setCurrentView('list');
  };

  if (!isAuthenticated) {
    return showLogin ? (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setShowLogin(false)}
      />
    ) : (
      <Register 
        onRegister={handleRegister} 
        onSwitchToLogin={() => setShowLogin(true)}
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
          <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
        </div>
      </header>
      
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentView('list')} 
          className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
        >
          📋 Invoices
        </button>
        <button 
          onClick={handleNewInvoice}
          className={`nav-btn ${currentView === 'form' ? 'active' : ''}`}
        >
          ➕ New Invoice
        </button>
      </nav>

      <main className="app-main">
        {currentView === 'list' && (
          <InvoiceList onEditInvoice={handleEditInvoice} />
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