import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { generatePDF } from '../utils/pdfGenerator';
import './InvoiceForm.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://invoice-backend-final.vercel.app/api';
const InvoiceForm = ({ invoice, onBack }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    customerPhone: '',
    paymentStatus: 'pending',
    items: [{ srNo: 1, productName: '', measurement: 'CFT', quantity: 0, price: 0, total: 0 }],
    serviceCharge: { amount: 0, type: 'fixed', value: 0 },
    vat: { amount: 0, type: 'fixed', value: 0 },
    specialDiscount: 0,
    notes: ''
  });

  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingInvoiceNumber, setIsGeneratingInvoiceNumber] = useState(false);

  // Function to fetch invoice count and generate invoice number
  const generateInvoiceNumber = async () => {
    try {
      setIsGeneratingInvoiceNumber(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No token found, using temporary invoice number');
        return `INV-${new Date().getFullYear()}-TEMP`;
      }

      // Fetch invoices to get count
      const response = await axios.get(`${API_BASE_URL}/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Get the count of invoices
      const invoiceCount = response.data.length || 0;
      
      // Generate invoice number: INV-YYYY-NNN
      // Where NNN is the invoice count + 1 (padded to 3 digits)
      const year = new Date().getFullYear();
      const nextInvoiceNumber = invoiceCount + 1;
      const paddedNumber = nextInvoiceNumber.toString().padStart(3, '0');
      const invoiceNumber = `INV-${year}-${paddedNumber}`;
      
      console.log(`Generated invoice number: ${invoiceNumber} (based on ${invoiceCount} existing invoices)`);
      
      return invoiceNumber;
    } catch (error) {
      console.error('Error fetching invoice count:', error);
      
      // Fallback: Use timestamp-based invoice number
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const day = new Date().getDate().toString().padStart(2, '0');
      const timestamp = Date.now().toString().slice(-4);
      
      return `INV-${year}${month}${day}-${timestamp}`;
    } finally {
      setIsGeneratingInvoiceNumber(false);
    }
  };

  useEffect(() => {
    const initializeFormData = async () => {
      if (invoice && invoice._id) {
        console.log('Editing invoice:', invoice);

        // Make sure to include all fields including customerEmail
        setFormData({
          invoiceNumber: invoice.invoiceNumber || '',
          date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          customerName: invoice.customerName || '',
          customerEmail: invoice.customerEmail || '', // Fixed: Initialize email field
          customerAddress: invoice.customerAddress || '',
          customerPhone: invoice.customerPhone || '',
          paymentStatus: invoice.paymentStatus || 'pending',
          items: invoice.items || [{ srNo: 1, productName: '', measurement: 'CFT', quantity: 0, price: 0, total: 0 }],
          serviceCharge: invoice.serviceCharge || { amount: 0, type: 'fixed', value: 0 },
          vat: invoice.vat || { amount: 0, type: 'fixed', value: 0 },
          specialDiscount: invoice.specialDiscount || 0,
          notes: invoice.notes || ''
        });
      } else {
        // Generate new invoice number based on database count
        const loadInvoiceNumber = async () => {
          const invoiceNumber = await generateInvoiceNumber();
          setFormData(prev => ({
            ...prev,
            invoiceNumber,
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }));
        };
        
        loadInvoiceNumber();
      }
    };

    initializeFormData();
  }, [invoice]);

  // Function to refresh invoice number (if needed)
  const refreshInvoiceNumber = async () => {
    const newInvoiceNumber = await generateInvoiceNumber();
    setFormData(prev => ({
      ...prev,
      invoiceNumber: newInvoiceNumber
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];

    // For quantity and price, ensure they increment/decrement by 1
    if (field === 'quantity' || field === 'price') {
      const numValue = parseFloat(value);
      // Ensure the value changes by at least 1 or remains as entered
      updatedItems[index][field] = isNaN(numValue) ? 0 : numValue;

      // Recalculate total
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].price) || 0;
      updatedItems[index].total = quantity * price;
    } else {
      updatedItems[index][field] = value;
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          srNo: prev.items.length + 1,
          productName: '',
          measurement: 'CFT',
          quantity: 0,
          price: 0,
          total: 0
        }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, srNo: i + 1 }));
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  const handleChargeChange = (chargeType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [chargeType]: {
        ...prev[chargeType],
        [field]: value
      }
    }));
  };

  const validateEmail = (email) => {
    if (!email) return true; // Email is optional, so empty is valid
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    let serviceChargeAmount = 0;
    if (formData.serviceCharge.type === 'percentage') {
      serviceChargeAmount = (subtotal * parseFloat(formData.serviceCharge.value || 0)) / 100;
    } else {
      serviceChargeAmount = parseFloat(formData.serviceCharge.value || 0);
    }

    let vatAmount = 0;
    if (formData.vat.type === 'percentage') {
      vatAmount = (subtotal * parseFloat(formData.vat.value || 0)) / 100;
    } else {
      vatAmount = parseFloat(formData.vat.value || 0);
    }

    const grandTotal = subtotal + serviceChargeAmount + vatAmount;
    const netTotal = grandTotal - (parseFloat(formData.specialDiscount) || 0);

    return {
      subtotal,
      serviceChargeAmount,
      vatAmount,
      grandTotal,
      netTotal
    };
  };

  const prepareSubmitData = (totals) => {
    return {
      invoiceNumber: formData.invoiceNumber,
      date: new Date(formData.date).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
      customerName: formData.customerName,
      customerEmail: formData.customerEmail || '',
      customerAddress: formData.customerAddress || '',
      customerPhone: formData.customerPhone || '',
      paymentStatus: formData.paymentStatus,
      items: formData.items.map(item => ({
        srNo: item.srNo,
        productName: item.productName,
        measurement: item.measurement,
        quantity: parseFloat(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        total: parseFloat(item.total) || 0
      })),
      serviceCharge: {
        type: formData.serviceCharge.type,
        value: parseFloat(formData.serviceCharge.value) || 0,
        amount: totals.serviceChargeAmount
      },
      vat: {
        type: formData.vat.type,
        value: parseFloat(formData.vat.value) || 0,
        amount: totals.vatAmount
      },
      specialDiscount: parseFloat(formData.specialDiscount) || 0,
      subtotal: totals.subtotal,
      grandTotal: totals.grandTotal,
      netTotal: totals.netTotal,
      notes: formData.notes || ''
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerName || !formData.invoiceNumber) {
      alert('Please fill in Customer Name and Invoice Number');
      return;
    }

    // Validate email format
    if (!validateEmail(formData.customerEmail)) {
      alert('Please enter a valid email address or leave it empty');
      return;
    }

    // Validate items
    const invalidItems = formData.items.filter(item => !item.productName || item.quantity <= 0 || item.price <= 0);
    if (invalidItems.length > 0) {
      alert('Please fill in all item fields with valid values (Product Name, Quantity > 0, Price > 0)');
      return;
    }

    setIsSubmitting(true);
    const totals = calculateTotals();
    const submitData = prepareSubmitData(totals);

    console.log('Submitting data:', submitData);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No authentication token found. Please login again.');
        return;
      }

      let response;
      if (invoice && invoice._id) {
        response = await axios.put(
          `${API_BASE_URL}/invoices/${invoice._id}`,
          submitData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        alert('✅ Invoice updated successfully!');
      } else {
        response = await axios.post(
          `${API_BASE_URL}/invoices`,
          submitData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        alert('✅ Invoice created successfully!');
      }

      console.log('Server response:', response.data);
      onBack();

    } catch (error) {
      console.error('Error saving invoice:', error);

      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);

        if (error.response.status === 400) {
          alert(`Validation Error: ${error.response.data.error}`);
        } else if (error.response.status === 401) {
          alert('Authentication failed. Please login again.');
        } else if (error.response.status === 404) {
          alert('Invoice not found. It may have been deleted.');
        } else {
          alert(`Server Error: ${error.response.data.error || 'Unknown error'}`);
        }
      } else if (error.request) {
        alert('Network error: Cannot connect to server. Please check if backend is running.');
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDF = () => {
    const totals = calculateTotals();

    const pdfData = {
      invoiceNumber: formData.invoiceNumber,
      date: formData.date,
      dueDate: formData.dueDate,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerAddress: formData.customerAddress,
      customerPhone: formData.customerPhone,
      paymentStatus: formData.paymentStatus,

      items: formData.items.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        total: parseFloat(item.total) || 0
      })),

      serviceCharge: {
        type: formData.serviceCharge.type,
        value: parseFloat(formData.serviceCharge.value) || 0,
        amount: totals.serviceChargeAmount
      },
      vat: {
        type: formData.vat.type,
        value: parseFloat(formData.vat.value) || 0,
        amount: totals.vatAmount
      },

      subtotal: totals.subtotal,
      serviceChargeAmount: totals.serviceChargeAmount,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      specialDiscount: parseFloat(formData.specialDiscount) || 0,
      netTotal: totals.netTotal,

      notes: formData.notes || ''
    };

    console.log('PDF Generation Data:', pdfData);
    generatePDF(pdfData);
  };

  const totals = calculateTotals();

  return (
    <div className="invoice-form-container">
      {/* Header */}
      <div className="form-header">
        <div className="header-content">
          <div className="header-title">
            <h1>{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h1>
            <p>Manage your invoice details and generate professional PDFs</p>
          </div>
          <div className="invoice-preview">
            <div className="preview-badge">
              <span className="badge-label">Invoice #</span>
              <span className="badge-value">
                {formData.invoiceNumber}
                {isGeneratingInvoiceNumber && <span className="generating-text"> (generating...)</span>}
              </span>
            </div>
            {!invoice && (
              <button 
                type="button" 
                onClick={refreshInvoiceNumber}
                className="refresh-invoice-btn"
                title="Generate new invoice number"
                disabled={isGeneratingInvoiceNumber}
              >
                🔄
              </button>
            )}
          </div>
        </div>
        <button onClick={onBack} className="back-btn">
          ← Back to List
        </button>
      </div>

      <div className="form-content">
        <form onSubmit={handleSubmit} className="invoice-form">
          {/* Customer Information Section */}
          <div className="form-section card">
            <div className="section-header">
              <h3 className="section-title">
                <span className="section-icon">👤</span>
                Customer Information
              </h3>
              <div className="section-badge">Required</div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Invoice Number *
                  <span className="label-hint">Auto-generated</span>
                </label>
                <div className="invoice-number-display">
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    placeholder="INV-2024-001"
                    readOnly={!invoice} // Only editable when editing existing invoice
                  />
                  {!invoice && isGeneratingInvoiceNumber && (
                    <div className="invoice-number-loading">Loading...</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Invoice Date *
                  <span className="label-hint">Date of issue</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Due Date *
                  <span className="label-hint">Payment deadline</span>
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Payment Status
                  <span className="label-hint">Current payment state</span>
                </label>
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleInputChange}
                  className={`form-input status-select status-${formData.paymentStatus}`}
                >
                  <option value="pending" className="status-pending">⏳ Pending</option>
                  <option value="paid" className="status-paid">✅ Paid</option>
                  <option value="overdue" className="status-overdue">⚠️ Overdue</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  Customer Name *
                  <span className="label-hint">Full name or company name</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Enter customer full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Customer Email
                  <span className="label-hint">Email address (optional)</span>
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="customer@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Customer Phone
                  <span className="label-hint">Contact number</span>
                </label>
                <input
                  type="text"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="+8801XXXXXXXXX"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  Customer Address
                  <span className="label-hint">Full billing address</span>
                </label>
                <input
                  type="text"
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Street, City, Postal Code"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="form-section card">
            <div className="section-header">
              <div className="section-title-group">
                <h3 className="section-title">
                  <span className="section-icon">📦</span>
                  Items & Products
                </h3>
                <span className="items-count">{formData.items.length} items</span>
              </div>
              <button type="button" onClick={addItem} className="add-item-btn">
                <span className="btn-icon">+</span>
                Add Item
              </button>
            </div>

            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th width="5%">#</th>
                    <th width="30%">Product Description</th>
                    <th width="12%">Unit</th>
                    <th width="12%">Quantity</th>
                    <th width="15%">Unit Price (৳)</th>
                    <th width="15%">Total (৳)</th>
                    <th width="11%">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="item-row">
                      <td className="serial-number">{item.srNo}</td>
                      <td>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="table-input"
                          placeholder="Enter product name"
                          required
                        />
                      </td>
                      <td>
                        <select
                          value={item.measurement}
                          onChange={(e) => handleItemChange(index, 'measurement', e.target.value)}
                          className="table-input measurement-select"
                        >
                          <option value="CFT">CFT</option>
                          <option value="PCS">PCS</option>
                          <option value="SFT">SFT</option>
                          <option value="KG">KG</option>
                          <option value="LTR">LTR</option>
                        </select>
                      </td>
                      <td>
                        <div className="quantity-control">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            min="0"
                            step="1"
                            className="table-input number-input"
                            required
                          />
                        </div>
                      </td>
                      <td>
                        <div className="price-control">
                          <div className="price-input-container">
                            <span className="currency-symbol">৳</span>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                              min="0"
                              step="1"
                              className="table-input number-input"
                              required
                            />
                          </div>
                        </div>
                      </td>
                      <td className="total-cell">
                        <div className="total-amount">
                          ৳{item.total?.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="remove-btn"
                          disabled={formData.items.length === 1}
                          title="Remove item"
                        >
                          <span className="remove-icon">×</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations Section */}
          <div className="form-section card">
            <div className="section-header">
              <h3 className="section-title">
                <span className="section-icon">🧮</span>
                Calculations & Charges
              </h3>
              <div className="total-summary">
                Net Total: <span className="net-total-amount">৳{totals.netTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="calculations-grid">
              <div className="calc-row">
                <span className="calc-label">Subtotal</span>
                <span className="calc-value">৳{totals.subtotal.toLocaleString()}</span>
              </div>

              <div className="charge-row">
                <div className="charge-controls">
                  <span className="calc-label">Service Charge</span>
                  <div className="charge-inputs">
                    <select
                      value={formData.serviceCharge.type}
                      onChange={(e) => handleChargeChange('serviceCharge', 'type', e.target.value)}
                      className="charge-select"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percentage">Percentage</option>
                    </select>
                    <div className="charge-input-wrapper">
                      <input
                        type="number"
                        value={formData.serviceCharge.value}
                        onChange={(e) => handleChargeChange('serviceCharge', 'value', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        className="charge-input"
                        placeholder={formData.serviceCharge.type === 'percentage' ? '%' : 'Amount'}
                      />
                      {formData.serviceCharge.type === 'percentage' && (
                        <span className="charge-symbol">%</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="calc-value">৳{totals.serviceChargeAmount.toLocaleString()}</span>
              </div>

              <div className="charge-row">
                <div className="charge-controls">
                  <span className="calc-label">VAT</span>
                  <div className="charge-inputs">
                    <select
                      value={formData.vat.type}
                      onChange={(e) => handleChargeChange('vat', 'type', e.target.value)}
                      className="charge-select"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percentage">Percentage</option>
                    </select>
                    <div className="charge-input-wrapper">
                      <input
                        type="number"
                        value={formData.vat.value}
                        onChange={(e) => handleChargeChange('vat', 'value', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        className="charge-input"
                        placeholder={formData.vat.type === 'percentage' ? '%' : 'Amount'}
                      />
                      {formData.vat.type === 'percentage' && (
                        <span className="charge-symbol">%</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="calc-value">৳{totals.vatAmount.toLocaleString()}</span>
              </div>

              <div className="calc-row grand-total">
                <span className="calc-label">Grand Total</span>
                <span className="calc-value">৳{totals.grandTotal.toLocaleString()}</span>
              </div>

              <div className="charge-row discount-row">
                <div className="charge-controls">
                  <span className="calc-label">Special Discount</span>
                  <div className="charge-inputs">
                    <div className="charge-input-wrapper discount-input">
                      <span className="currency-symbol">৳</span>
                      <input
                        type="number"
                        value={formData.specialDiscount}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specialDiscount: parseFloat(e.target.value)
                        }))}
                        min="0"
                        step="1"
                        className="charge-input"
                        placeholder="Discount amount"
                      />
                    </div>
                  </div>
                </div>
                <span className="calc-value discount-value">-৳{formData.specialDiscount.toLocaleString()}</span>
              </div>

              <div className="calc-row net-total-row">
                <span className="calc-label">Net Total</span>
                <span className="calc-value net-total-value">৳{totals.netTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="form-section card">
            <h3 className="section-title">
              <span className="section-icon">📝</span>
              Additional Notes
            </h3>
            <div className="notes-container">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                className="notes-textarea"
                placeholder="Add any additional notes, terms, or special instructions for this invoice..."
              />
              <div className="notes-hint">
                This will appear at the bottom of the generated PDF invoice.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onBack}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              <span className="btn-icon">←</span>
              Cancel
            </button>
            <div className="action-buttons">
              <button
                type="button"
                onClick={() => setShowPDFPreview(true)}
                className="btn btn-info"
                disabled={isSubmitting}
              >
                <span className="btn-icon">👁️</span>
                Preview PDF
              </button>
              <button
                type="button"
                onClick={handleGeneratePDF}
                className="btn btn-warning"
                disabled={isSubmitting}
              >
                <span className="btn-icon">📄</span>
                Generate PDF
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || isGeneratingInvoiceNumber}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner"></span>
                    {invoice ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <span className="btn-icon">{invoice ? '💾' : '✨'}</span>
                    {invoice ? 'Update Invoice' : 'Create Invoice'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <div className="pdf-preview-modal">
          <div className="pdf-preview-content">
            <div className="pdf-preview-header">
              <h3>PDF Preview</h3>
              <button
                onClick={() => setShowPDFPreview(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="pdf-preview-body">
              <div className="preview-placeholder">
                <div className="preview-icon">📄</div>
                <h4>Invoice Preview</h4>
                <p>This is how your invoice will appear in the generated PDF.</p>
              </div>
              <div className="preview-summary">
                <div className="preview-item">
                  <span>Invoice #:</span>
                  <strong>{formData.invoiceNumber}</strong>
                </div>
                <div className="preview-item">
                  <span>Customer:</span>
                  <strong>{formData.customerName}</strong>
                </div>
                <div className="preview-item">
                  <span>Email:</span>
                  <strong>{formData.customerEmail || 'N/A'}</strong>
                </div>
                <div className="preview-item">
                  <span>Subtotal:</span>
                  <strong>৳{totals.subtotal.toLocaleString()}</strong>
                </div>
                <div className="preview-item">
                  <span>Service Charge:</span>
                  <strong>৳{totals.serviceChargeAmount.toLocaleString()}</strong>
                </div>
                <div className="preview-item">
                  <span>VAT:</span>
                  <strong>৳{totals.vatAmount.toLocaleString()}</strong>
                </div>
                <div className="preview-item">
                  <span>Discount:</span>
                  <strong>-৳{formData.specialDiscount.toLocaleString()}</strong>
                </div>
                <div className="preview-item total">
                  <span>Net Total:</span>
                  <strong>৳{totals.netTotal.toLocaleString()}</strong>
                </div>
              </div>
              <div className="preview-actions">
                <button
                  onClick={handleGeneratePDF}
                  className="btn btn-primary"
                >
                  <span className="btn-icon">⬇️</span>
                  Download PDF
                </button>
                <button
                  onClick={() => setShowPDFPreview(false)}
                  className="btn btn-secondary"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;