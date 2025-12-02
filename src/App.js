import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('list');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentView('list');
    setSelectedInvoice(null);
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

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>VQS Invoice System</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>
      
      <nav className="app-nav">
        <button 
          onClick={() => setCurrentView('list')} 
          className={currentView === 'list' ? 'active' : ''}
        >
          Invoices
        </button>
        <button 
          onClick={handleNewInvoice}
          className={currentView === 'form' ? 'active' : ''}
        >
          New Invoice
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
      </main>
    </div>
  );
}

export default App;