import React, { useState, useEffect } from 'react';
import api from '../api/config';
import { generatePDF } from '../utils/pdfGenerator';
import './InvoiceForm.css';

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
    items: [{ srNo: 1, productName: '', measurement: 'PCS', quantity: 1, price: 0, total: 0 }],
    serviceCharge: { amount: 0, type: 'fixed', value: 0 },
    vat: { amount: 0, type: 'fixed', value: 0 },
    specialDiscount: 0,
    notes: ''
  });

  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingInvoiceNumber, setIsGeneratingInvoiceNumber] = useState(false);

  const generateInvoiceNumber = async () => {
    try {
      setIsGeneratingInvoiceNumber(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No token found, using temporary invoice number');
        return `INV-${new Date().getFullYear()}-TEMP`;
      }

      const response = await api.get('/invoices');
      const invoiceCount = response.data.length || 0;
      const year = new Date().getFullYear();
      const nextInvoiceNumber = invoiceCount + 1;
      const paddedNumber = nextInvoiceNumber.toString().padStart(4, '0');
      const invoiceNumber = `INV-${year}-${paddedNumber}`;
      
      console.log(`Generated invoice number: ${invoiceNumber}`);
      return invoiceNumber;
    } catch (error) {
      console.error('Error fetching invoice count:', error);
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
        setFormData({
          invoiceNumber: invoice.invoiceNumber || '',
          date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          customerName: invoice.customerName || '',
          customerEmail: invoice.customerEmail || '',
          customerAddress: invoice.customerAddress || '',
          customerPhone: invoice.customerPhone || '',
          paymentStatus: invoice.paymentStatus || 'pending',
          items: invoice.items || [{ srNo: 1, productName: '', measurement: 'PCS', quantity: 1, price: 0, total: 0 }],
          serviceCharge: invoice.serviceCharge || { amount: 0, type: 'fixed', value: 0 },
          vat: invoice.vat || { amount: 0, type: 'fixed', value: 0 },
          specialDiscount: invoice.specialDiscount || 0,
          notes: invoice.notes || ''
        });
      } else {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    if (field === 'quantity' || field === 'price') {
      const numValue = parseFloat(value) || 0;
      updatedItems[index][field] = numValue;
      
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
          measurement: 'PCS',
          quantity: 1,
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
    if (!email) return true;
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

    if (!formData.customerName || !formData.invoiceNumber) {
      alert('Please fill in Customer Name and Invoice Number');
      return;
    }

    if (!validateEmail(formData.customerEmail)) {
      alert('Please enter a valid email address or leave it empty');
      return;
    }

    const invalidItems = formData.items.filter(item => !item.productName || item.quantity <= 0 || item.price < 0);
    if (invalidItems.length > 0) {
      alert('Please fill in all item fields with valid values');
      return;
    }

    setIsSubmitting(true);
    const totals = calculateTotals();
    const submitData = prepareSubmitData(totals);

    try {
      let response;
      if (invoice && invoice._id) {
        response = await api.put(`/invoices/${invoice._id}`, submitData);
        alert('✅ Invoice updated successfully!');
      } else {
        response = await api.post('/invoices', submitData);
        alert('✅ Invoice created successfully!');
      }

      onBack();

    } catch (error) {
      console.error('Error saving invoice:', error);
      
      if (error.response) {
        if (error.response.status === 400) {
          alert(`Validation Error: ${error.response.data.error}`);
        } else if (error.response.status === 401) {
          alert('Authentication failed. Please login again.');
        } else if (error.response.status === 404) {
          alert('Invoice not found.');
        } else {
          alert(`Server Error: ${error.response.data.error || 'Unknown error'}`);
        }
      } else if (error.request) {
        alert('Network error: Cannot connect to server.');
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

    generatePDF(pdfData);
  };

  const totals = calculateTotals();

  return (
    <div className="invoice-form-container">
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
          </div>
        </div>
        <button onClick={onBack} className="back-btn">
          ← Back to List
        </button>
      </div>

      <div className="form-content">
        <form onSubmit={handleSubmit} className="invoice-form">
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
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="INV-2024-001"
                  readOnly={!!invoice}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Invoice Date *
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
                </label>
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleInputChange}
                  className={`form-input status-select status-${formData.paymentStatus}`}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="paid">✅ Paid</option>
                  <option value="overdue">⚠️ Overdue</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  Customer Name *
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
                          <option value="PCS">PCS</option>
                          <option value="CFT">CFT</option>
                          <option value="SFT">SFT</option>
                          <option value="KG">KG</option>
                          <option value="LTR">LTR</option>
                          <option value="M">M</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="1"
                          step="1"
                          className="table-input number-input"
                          required
                        />
                      </td>
                      <td>
                        <div className="price-input-container">
                          <span className="currency-symbol">৳</span>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            min="0"
                            step="0.01"
                            className="table-input number-input"
                            required
                          />
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
                placeholder="Add any additional notes, terms, or special instructions..."
              />
            </div>
          </div>

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
    </div>
  );
};

export default InvoiceForm;