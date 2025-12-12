import React, { useState, useEffect } from 'react';
import api from '../api/config';
import { format } from 'date-fns';
import './InvoiceList.css';

const InvoiceList = ({ onEditInvoice, refreshTrigger }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, [refreshTrigger]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/invoices');
      setInvoices(response.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(invoices.filter(invoice => invoice._id !== id));
      alert('Invoice deleted successfully!');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice. Please try again.');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      default: return 'status-pending';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      default: return 'Pending';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || invoice.paymentStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2
    }).format(amount).replace('BDT', '৳');
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
      <div className="list-header">
        <div className="header-left">
          <h2>Invoices</h2>
          <p className="subtitle">Manage and view all your invoices</p>
        </div>
        <div className="header-right">
          <button onClick={() => window.print()} className="btn btn-secondary">
            📄 Print List
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by invoice #, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-controls">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          <button onClick={fetchInvoices} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="invoice-stats">
        <div className="stat-card">
          <span className="stat-label">Total Invoices</span>
          <span className="stat-value">{invoices.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value">
            {invoices.filter(i => i.paymentStatus === 'pending').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Paid</span>
          <span className="stat-value">
            {invoices.filter(i => i.paymentStatus === 'paid').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Overdue</span>
          <span className="stat-value">
            {invoices.filter(i => i.paymentStatus === 'overdue').length}
          </span>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No invoices found</h3>
          <p>{searchTerm || filterStatus !== 'all' ? 'Try changing your search or filter' : 'Create your first invoice to get started'}</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td className="invoice-number">
                    <strong>{invoice.invoiceNumber}</strong>
                  </td>
                  <td>{formatDate(invoice.date)}</td>
                  <td className="customer-cell">
                    <div className="customer-info">
                      <strong>{invoice.customerName}</strong>
                      {invoice.customerPhone && (
                        <span className="customer-phone">{invoice.customerPhone}</span>
                      )}
                    </div>
                  </td>
                  <td>{invoice.customerEmail || 'N/A'}</td>
                  <td className="amount-cell">
                    <strong>{formatCurrency(invoice.netTotal)}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(invoice.paymentStatus)}`}>
                      {getStatusText(invoice.paymentStatus)}
                    </span>
                  </td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => onEditInvoice(invoice)}
                      className="action-btn edit-btn"
                      title="Edit invoice"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(invoice._id)}
                      className="action-btn delete-btn"
                      title="Delete invoice"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="list-footer">
        <p className="count-info">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </p>
        <div className="export-options">
          <button className="export-btn" onClick={() => alert('Export feature coming soon!')}>
            📊 Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;