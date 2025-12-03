import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { generatePDF } from '../utils/pdfGenerator';
import './InvoiceList.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://invoice-backend-final.vercel.app/api';

const InvoiceList = ({ onEditInvoice, refreshTrigger }) => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track which invoices are being updated

  // Enhanced status calculation that considers paymentStatus and due date
  const calculateInvoiceStatus = (invoice) => {
    // If explicitly marked as paid in database, return paid
    if (invoice.paymentStatus === 'paid') {
      return 'paid';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(23, 59, 59, 999);

      // If due date has passed, mark as overdue (unless already paid)
      if (dueDate < today) {
        return 'overdue';
      }

      // If due date is within 3 days, mark as pending (with warning)
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 3) {
        return 'pending'; // This will be styled as "due soon"
      }
    }

    // Default to payment status or pending
    return invoice.paymentStatus || 'pending';
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
      const invoicesWithStatus = res.data.map(invoice => {
        const calculatedStatus = calculateInvoiceStatus(invoice);
        return {
          ...invoice,
          calculatedStatus,
          // Ensure we have a consistent paymentStatus field
          paymentStatus: invoice.paymentStatus || 'pending'
        };
      });

      setInvoices(invoicesWithStatus);
      setFilteredInvoices(invoicesWithStatus);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/invoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  };

  const handleGeneratePDF = (invoice) => {
    generatePDF(invoice);
  };

  // Enhanced status update handler with proper status cycling
  const handleUpdateStatus = async (invoiceId, currentStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [invoiceId]: true }));

      const token = localStorage.getItem('token');

      // Determine next status based on current status
      let newPaymentStatus;

      switch (currentStatus) {
        case 'paid':
          // If currently paid, mark as pending
          newPaymentStatus = 'pending';
          break;
        case 'overdue':
          // If overdue, mark as paid (overdue bills can be paid)
          newPaymentStatus = 'paid';
          break;
        case 'pending':
        default:
          // If pending, mark as paid
          newPaymentStatus = 'paid';
          break;
      }

      console.log(`Updating invoice ${invoiceId}: ${currentStatus} -> ${newPaymentStatus}`);

      // Update in backend
      const response = await axios.patch(
        `${API_BASE_URL}/invoices/${invoiceId}`,
        { paymentStatus: newPaymentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Backend response:', response.data);

      // Update local state immediately for better UX
      setInvoices(prevInvoices =>
        prevInvoices.map(inv => {
          if (inv._id === invoiceId) {
            const updatedInvoice = {
              ...inv,
              paymentStatus: newPaymentStatus
            };
            // Recalculate status based on new payment status
            const newCalculatedStatus = calculateInvoiceStatus(updatedInvoice);
            return {
              ...updatedInvoice,
              calculatedStatus: newCalculatedStatus
            };
          }
          return inv;
        })
      );

    } catch (error) {
      console.error('Error updating invoice status:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
      // Re-fetch to ensure consistency
      fetchInvoices();
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getStatusColor = (status) => {
    switch (status) {
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
    switch (status) {
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
    switch (status) {
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

  const getStatusButtonStyle = (status, isLoading) => {
    const baseStyle = {
      color: 'white',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? 0.7 : 1,
      transition: 'all 0.3s ease'
    };

    switch (status) {
      case 'paid':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #27ae60 0%, #219653 100%)'
        };
      case 'overdue':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
        };
      case 'pending':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
        };
      default:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)'
        };
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '৳0.00';
    return `৳${parseFloat(amount).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Calculate totals by status
  const calculateTotalsByStatus = () => {
    const totals = {
      pending: 0,
      paid: 0,
      overdue: 0,
      all: 0
    };

    invoices.forEach(invoice => {
      const amount = invoice.netTotal || 0;
      const status = invoice.calculatedStatus;

      if (totals[status] !== undefined) {
        totals[status] += amount;
      }
      totals.all += amount;
    });

    return totals;
  };

  const statusTotals = calculateTotalsByStatus();

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
            <div className="stat-amount">
              {formatCurrency(statusTotals.all)}
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value" style={{ color: getStatusColor('pending') }}>
              {invoices.filter(i => i.calculatedStatus === 'pending').length}
            </span>
            <div className="stat-amount" style={{ color: getStatusColor('pending') }}>
              {formatCurrency(statusTotals.pending)}
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label">Paid</span>
            <span className="stat-value" style={{ color: getStatusColor('paid') }}>
              {invoices.filter(i => i.calculatedStatus === 'paid').length}
            </span>
            <div className="stat-amount" style={{ color: getStatusColor('paid') }}>
              {formatCurrency(statusTotals.paid)}
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label">Overdue</span>
            <span className="stat-value" style={{ color: getStatusColor('overdue') }}>
              {invoices.filter(i => i.calculatedStatus === 'overdue').length}
            </span>
            <div className="stat-amount" style={{ color: getStatusColor('overdue') }}>
              {formatCurrency(statusTotals.overdue)}
            </div>
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
        <>
          <div className="table-container">
            <div className="table-responsive">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Invoice & Date</th>
                    <th style={{ width: '30%' }}>Customer Information</th>
                    <th style={{ width: '20%' }}>Status & Amount</th>
                    <th style={{ width: '25%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="invoice-row">
                      <td className="invoice-number-date">
                        <div className="invoice-number-main">
                          <strong>#{invoice.invoiceNumber}</strong>
                        </div>
                        <div className="invoice-date-main">
                          <span className="date-label">Date: </span>
                          {new Date(invoice.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {invoice.dueDate && (
                          <div className="invoice-due-date">
                            <span className="due-label">Due: </span>
                            {new Date(invoice.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        )}
                      </td>

                      <td className="customer-info-combined">
                        <div className="customer-name-main">
                          <strong>{invoice.customerName}</strong>
                        </div>
                        <div className="customer-contact-details">
                          {invoice.customerEmail && (
                            <div className="customer-email-main">
                              <span className="contact-icon">✉️</span>
                              <span className="contact-text">{invoice.customerEmail}</span>
                            </div>
                          )}
                          {invoice.customerPhone && (
                            <div className="customer-phone-main">
                              <span className="contact-icon">📱</span>
                              <span className="contact-text">{invoice.customerPhone}</span>
                            </div>
                          )}
                          {invoice.customerAddress && (
                            <div className="customer-address-truncated" title={invoice.customerAddress}>
                              <span className="contact-icon">📍</span>
                              <span className="contact-text">
                                {invoice.customerAddress.length > 50
                                  ? `${invoice.customerAddress.substring(0, 50)}...`
                                  : invoice.customerAddress}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="status-column">
                        <div className="status-display-main">
                          <button
                            className="action-btn status-btn"
                            style={getStatusButtonStyle(invoice.calculatedStatus, updatingStatus[invoice._id])}

                            disabled={updatingStatus[invoice._id]}
                            title={
                              invoice.calculatedStatus === 'paid'
                                ? 'Click to mark as Pending'
                                : invoice.calculatedStatus === 'overdue'
                                  ? 'Click to mark as Paid'
                                  : 'Click to mark as Paid'
                            }
                          >
                            <span className="btn-icon">
                              {updatingStatus[invoice._id] ? '⏳' : getStatusEmoji(invoice.calculatedStatus)}
                            </span>
                            <span className="btn-text">
                              {updatingStatus[invoice._id] ? 'Updating...' : getStatusText(invoice.calculatedStatus)}
                            </span>
                          </button>
                        </div>

                        <div className="status-amount-info">
                          <div className="status-amount-label">Net Total:</div>
                          <div className="status-amount-value" style={{ color: getStatusColor(invoice.calculatedStatus) }}>
                            {formatCurrency(invoice.netTotal)}
                          </div>
                        </div>
                      </td>

                      <td className="action-column">
                        <div className="action-group-main">
                          <div className="action-controls-main">
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
          </div>

          <div className="table-footer">
            <div className="footer-info">
              Showing {filteredInvoices.length} of {invoices.length} invoices
              {searchTerm && ` for "${searchTerm}"`}
              <div className="total-summary">
                Total Value: <strong>{formatCurrency(statusTotals.all)}</strong>
              </div>
            </div>
            <div className="footer-actions">
              <button onClick={fetchInvoices} className="refresh-btn">
                <span className="refresh-icon">🔄</span>
                Refresh List
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceList;