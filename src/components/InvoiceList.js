
//InvoiceList.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { generatePDF } from '../utils/pdfGenerator';
import './InvoiceList.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ||'https://invoice-backend-final.vercel.app/api';
const InvoiceList = ({ onEditInvoice, refreshTrigger }) => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'descending'
  });

  // Calculate invoice status based on date and payment status
  const calculateInvoiceStatus = (invoice) => {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate || invoice.date);
    
    // If invoice is marked as paid
    if (invoice.paymentStatus === 'paid') {
      return 'paid';
    }
    
    // If due date has passed
    if (dueDate < today) {
      return 'overdue';
    }
    
    // If invoice is due within 3 days
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3) {
      return 'pending';
    }
    
    // Default status
    return invoice.status || 'pending';
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Calculate status for each invoice
      const invoicesWithStatus = res.data.map(invoice => ({
        ...invoice,
        calculatedStatus: calculateInvoiceStatus(invoice)
      }));
      
      setInvoices(invoicesWithStatus);
      setFilteredInvoices(invoicesWithStatus);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh when refreshTrigger changes or component mounts
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshTrigger]);

  useEffect(() => {
    filterInvoices();
  }, [searchTerm, invoices]);

  const filterInvoices = () => {
    if (!searchTerm.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = invoices.filter(invoice => {
      return (
        invoice.customerName?.toLowerCase().includes(term) ||
        invoice.customerPhone?.toLowerCase().includes(term) ||
        invoice.customerEmail?.toLowerCase().includes(term) ||
        invoice.invoiceNumber?.toLowerCase().includes(term) ||
        invoice.customerAddress?.toLowerCase().includes(term)
      );
    });
    setFilteredInvoices(filtered);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      
      // Handle dates
      if (key === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Handle numbers
      if (key === 'netTotal') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      
      if (aValue < bValue) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredInvoices(sortedInvoices);
    setSortConfig({ key, direction });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/invoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchInvoices(); // Refresh list after deletion
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  };

  const handleGeneratePDF = (invoice) => {
    generatePDF(invoice);
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/invoices/${invoiceId}`,
        { paymentStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchInvoices(); // Refresh to show updated status
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid':
        return '#27ae60';
      case 'overdue':
        return '#e74c3c';
      case 'pending':
        return '#f39c12';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      case 'pending':
        return 'Pending';
      default:
        return 'Pending';
    }
  };

  const getStatusEmoji = (status) => {
    switch(status) {
      case 'paid':
        return '✅';
      case 'overdue':
        return '⚠️';
      case 'pending':
        return '⏳';
      default:
        return '⏳';
    }
  };

  const getStatusButtonStyle = (status) => {
    switch(status) {
      case 'paid':
        return { background: 'linear-gradient(135deg, #27ae60 0%, #219653 100%)', color: 'white' };
      case 'overdue':
        return { background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color: 'white' };
      case 'pending':
        return { background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: 'white' };
      default:
        return { background: 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)', color: 'white' };
    }
  };

  const getStatusUpdateButtonText = (currentStatus) => {
    switch(currentStatus) {
      case 'paid':
        return 'Mark Pending';
      case 'overdue':
      case 'pending':
        return 'Mark Paid';
      default:
        return 'Mark Paid';
    }
  };

  const getNextStatus = (currentStatus) => {
    switch(currentStatus) {
      case 'paid':
        return 'pending';
      case 'overdue':
      case 'pending':
        return 'paid';
      default:
        return 'paid';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="invoice-list-container">
      <div className="invoice-list-header">
        <div className="header-content">
          <h1>Invoice Management</h1>
          <p>View and manage all your invoices</p>
        </div>
        <div className="stats-card">
          <div className="stat-item">
            <span className="stat-label">Total Invoices</span>
            <span className="stat-value">{invoices.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value" style={{color: getStatusColor('pending')}}>
              {invoices.filter(i => i.calculatedStatus === 'pending').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Paid</span>
            <span className="stat-value" style={{color: getStatusColor('paid')}}>
              {invoices.filter(i => i.calculatedStatus === 'paid').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overdue</span>
            <span className="stat-value" style={{color: getStatusColor('overdue')}}>
              {invoices.filter(i => i.calculatedStatus === 'overdue').length}
            </span>
          </div>
        </div>
      </div>

      <div className="search-container">
        <div className="search-box">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Search by customer name, phone, email or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={clearSearch} className="clear-search-btn">
              ✕
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="search-results-info">
            Found {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} for "{searchTerm}"
          </div>
        )}
      </div>

      {error && (
        <div className="error-alert">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={fetchInvoices} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No invoices found</h3>
          <p>
            {searchTerm
              ? 'No invoices match your search criteria. Try a different search term.'
              : 'No invoices have been created yet.'}
          </p>
          {searchTerm && (
            <button onClick={clearSearch} className="btn-secondary">
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="invoice-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('invoiceNumber')} className="sortable">
                  Invoice # {getSortIcon('invoiceNumber')}
                </th>
                <th onClick={() => handleSort('date')} className="sortable">
                  Date {getSortIcon('date')}
                </th>
                <th onClick={() => handleSort('customerName')} className="sortable">
                  Customer {getSortIcon('customerName')}
                </th>
                <th>Phone</th>
                <th onClick={() => handleSort('netTotal')} className="sortable">
                  Net Total {getSortIcon('netTotal')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice._id} className="invoice-row">
                  <td className="invoice-number">
                    <strong>#{invoice.invoiceNumber}</strong>
                  </td>
                  <td className="invoice-date">
                    {new Date(invoice.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="customer-info">
                    <div className="customer-name">{invoice.customerName}</div>
                    <div className="customer-email">{invoice.customerEmail || 'No email'}</div>
                  </td>
                  <td className="customer-phone">{invoice.customerPhone || 'N/A'}</td>
                  <td className="net-total">
                    <span className="amount">৳{invoice.netTotal?.toLocaleString()}</span>
                  </td>
                  <td className="action-buttons">
                    <div className="action-group">
                      <div className="status-display">
                        <button
                          className="action-btn status-btn"
                          style={getStatusButtonStyle(invoice.calculatedStatus)}
                          title={`Status: ${getStatusText(invoice.calculatedStatus)}\nDue: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}`}
                        >
                          <span className="btn-icon">{getStatusEmoji(invoice.calculatedStatus)}</span>
                          <span className="btn-text">{getStatusText(invoice.calculatedStatus)}</span>
                        </button>
                      </div>
                      <div className="action-controls">
                       
                        <button
                          className="action-btn pdf-btn"
                          onClick={() => handleGeneratePDF(invoice)}
                          title="Download PDF"
                        >
                          <span className="btn-icon">📄</span>
                          <span className="btn-text">PDF</span>
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => onEditInvoice(invoice)}
                          title="Edit Invoice"
                        >
                          <span className="btn-icon">✏️</span>
                          <span className="btn-text">Edit</span>
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(invoice._id)}
                          title="Delete Invoice"
                        >
                          <span className="btn-icon">🗑️</span>
                          <span className="btn-text">Delete</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        <div className="footer-info">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
        <div className="footer-actions">
          <button onClick={fetchInvoices} className="refresh-btn">
            <span className="refresh-icon">🔄</span>
            Refresh List
          </button>
          <div className="status-legend">
            <div className="legend-item">
              <span className="legend-color" style={{backgroundColor: getStatusColor('pending')}}></span>
              <span>Pending</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{backgroundColor: getStatusColor('paid')}}></span>
              <span>Paid</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{backgroundColor: getStatusColor('overdue')}}></span>
              <span>Overdue</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;