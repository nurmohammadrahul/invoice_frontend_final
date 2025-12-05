import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = async (invoiceData) => {
  console.log('=== PDF GENERATION STARTED ===');
  console.log('Invoice Data:', invoiceData);

  // Create PDF document with white background
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true
  });

  // Set default text color to black
  doc.setTextColor(0, 0, 0);

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // =============== COMPANY HEADER ===============
  // White background with dark text
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company logo with image
  try {
    await loadAndAddLogo(doc);
  } catch (error) {
    console.warn('Logo failed to load, using fallback:', error);
    addTextLogo(doc);
  }

  // Company name and tagline (center) - Black text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('VQS', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60); // Dark gray for tagline
  doc.text('VALUE | QUALITY | SERVICE', pageWidth / 2, 26, { align: 'center' });

  // Add separator line below header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageWidth - margin, 35);

  // =============== INVOICE HEADER (RIGHT SIDE) ===============
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const invoiceNumber = invoiceData.invoiceNumber || 'INV-0000';
  const invoiceDate = invoiceData.date
    ? new Date(invoiceData.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    : new Date().toLocaleDateString('en-GB');

  // Right-aligned invoice info
  const invoiceInfoX = pageWidth - margin - 10;
  const invoiceInfoY = 18;

  // "INVOICE" label
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', invoiceInfoX, invoiceInfoY - 8, { align: 'right' });

  // Invoice details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const invoiceDetails = [
    `Invoice No: ${invoiceNumber}`,
    `Date: ${invoiceDate}`
  ];

  invoiceDetails.forEach((line, index) => {
    doc.text(line, invoiceInfoX, invoiceInfoY + (index * 5), { align: 'right' });
  });

  yPos = 40;

  // =============== FROM/TO ADDRESSES ===============
  const columnWidth = (contentWidth - 10) / 2;

  // From address - Light gray background
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, yPos, columnWidth, 45, 3, 3, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.roundedRect(margin, yPos, columnWidth, 45, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60); // Dark gray
  doc.text('BILL FROM', margin + 10, yPos + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // Black
  const fromAddress = [
    'VQS',
    '256, Old Police Quarter',
    'Shahid Shahidullah Kayser Sarak',
    'Link Shahid Wayez Uddin Road',
    'Feni City, Feni-3900, Bangladesh',
    'Cell Phone: 01842956166',
    'Email: tipucbc@gmail.com'
  ];

  fromAddress.forEach((line, index) => {
    doc.text(line, margin + 10, yPos + 13 + (index * 4));
  });

  // To address
  const toX = margin + columnWidth + 10;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(toX, yPos, columnWidth, 45, 3, 3, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.roundedRect(toX, yPos, columnWidth, 45, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('BILL TO', toX + 10, yPos + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(invoiceData.customerName || 'Customer Name', toX + 10, yPos + 13);

  const customerAddress = invoiceData.customerAddress || 'Address not provided';
  const addressLines = doc.splitTextToSize(customerAddress, 70);
  addressLines.forEach((line, index) => {
    doc.text(line, toX + 10, yPos + 20 + (index * 3.8));
  });

  const addressHeight = addressLines.length * 3.8;
  const infoY = yPos + 18 + addressHeight + 2;

  if (invoiceData.customerPhone) {
    doc.text(`Phone: ${invoiceData.customerPhone}`, toX + 10, infoY);
  }
  if (invoiceData.customerEmail) {
    doc.text(`Email: ${invoiceData.customerEmail}`, toX + 10, infoY + 4);
  }

  yPos += 46;

  // =============== ITEMS TABLE ===============
  const items = invoiceData.items || [];

  // Prepare table data
  const tableData = items.map((item, index) => {
    const quantity = parseFloat(item.quantity || 0);
    const price = parseFloat(item.price || 0);
    const total = parseFloat(item.total || 0);

    return [
      index + 1,
      item.productName || 'Product',
      item.measurement || 'PCS',
      quantity.toLocaleString('en-BD'),
      `TK ${price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`,
      `TK ${total.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`
    ];
  });

  // Use autoTable function
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'PRODUCT', 'UNIT', 'QUANTITY', 'PRICE', 'AMOUNT']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak',
      lineColor: [180, 180, 180], // Darker gray lines
      lineWidth: 0.3,
      textColor: [0, 0, 0], // Black text
      fontStyle: 'normal'
    },
    headStyles: {
      fillColor: [60, 60, 60], // Dark gray header
      textColor: [255, 255, 255], // White text in header
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245] // Light gray alternate rows
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55, halign: 'left' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    theme: 'grid',
  });

  // Get the Y position after the table
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos + 10;
  yPos = finalY + 1;

  // =============== CALCULATIONS ===============
  // Values
  const subtotal = parseFloat(invoiceData.subtotal) || items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
  const serviceChargeAmount = parseFloat(invoiceData.serviceChargeAmount) || parseFloat(invoiceData.serviceCharge?.amount) || 0;
  const vatAmount = parseFloat(invoiceData.vatAmount) || parseFloat(invoiceData.vat?.amount) || 0;
  const discount = parseFloat(invoiceData.specialDiscount) || 0;
  const grandTotal = parseFloat(invoiceData.grandTotal) || (subtotal + serviceChargeAmount + vatAmount);
  const netTotal = parseFloat(invoiceData.netTotal) || (grandTotal - discount);

  // =============== DUE DATE & STATUS (LEFT SIDE OF CALCULATION BOX) ===============
  // Box size and positioning
  const calcBoxWidth = 80;
  const calcBoxX = pageWidth - margin - calcBoxWidth;
  const calcBoxY = yPos;

  // Create space on left for due date and status
  const leftInfoX = margin;
  const leftInfoY = calcBoxY + 5;

  // Due Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0); // Black

  const dueDateText = invoiceData.dueDate
    ? `Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })}`
    : 'Due Date: Upon Receipt';

  doc.text(dueDateText, leftInfoX, leftInfoY);

  // Status
  const status = invoiceData.paymentStatus || 'PENDING';
  let statusColor;
  let statusTextColor = [255, 255, 255]; // White text
  
  switch (status.toUpperCase()) {
    case 'PAID':
      statusColor = [76, 175, 80]; // Green
      break;
    case 'OVERDUE':
      statusColor = [244, 67, 54]; // Red
      break;
    default:
      statusColor = [255, 193, 7]; // Yellow
      statusTextColor = [0, 0, 0]; // Black text for yellow background
  }

  // Status badge
  const statusWidth = 30;
  const statusHeight = 8;
  const statusX = leftInfoX;
  const statusY = leftInfoY + 6;

  doc.setFillColor(...statusColor);
  doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 4, 4, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusTextColor);
  doc.text(status.toUpperCase(), statusX + statusWidth / 2, statusY + 5, { align: 'center' });

  // Rows list
  const calcRows = [
    { label: 'Subtotal', value: subtotal, style: 'normal' },
  ];

  if (serviceChargeAmount > 0) calcRows.push({
    label: invoiceData.serviceCharge?.type === 'percentage'
      ? `Service Charge (${invoiceData.serviceCharge.value}%)`
      : 'Service Charge',
    value: serviceChargeAmount,
    style: 'normal'
  });

  if (vatAmount > 0) calcRows.push({
    label: invoiceData.vat?.type === 'percentage'
      ? `VAT (${invoiceData.vat.value}%)`
      : 'VAT',
    value: vatAmount,
    style: 'normal'
  });

  calcRows.push({ label: 'Grand Total', value: grandTotal, style: 'bold' });

  if (discount > 0) calcRows.push({
    label: 'Special Discount',
    value: -discount,
    style: 'discount'
  });

  calcRows.push({ label: 'NET TOTAL', value: netTotal, style: 'total' });

  // ======= AUTO HEIGHT LOGIC =======
  const rowHeight = 6;
  const boxPadding = 10;
  const calcBoxHeight = calcRows.length * rowHeight + boxPadding;

  // Draw box with border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 180, 180);
  doc.roundedRect(calcBoxX, calcBoxY, calcBoxWidth, calcBoxHeight, 3, 3, 'FD');

  // ======= RENDER ROWS =======
  let calcY = calcBoxY + 7;

  calcRows.forEach(row => {
    doc.setFontSize(row.style === 'total' ? 11 : 9);

    if (row.style === 'bold') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(180, 180, 180);
      doc.line(calcBoxX + 5, calcY - 3, calcBoxX + calcBoxWidth - 5, calcY - 3);
    } else if (row.style === 'discount') {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(244, 67, 54); // Red for discount
    } else if (row.style === 'total') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(180, 180, 180);
      doc.line(calcBoxX + 5, calcY - 5, calcBoxX + calcBoxWidth - 5, calcY - 5);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    }

    doc.text(row.label, calcBoxX + 6, calcY);
    doc.text(
      `Tk ${Math.abs(row.value).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`,
      calcBoxX + calcBoxWidth - 6,
      calcY,
      { align: 'right' }
    );

    calcY += rowHeight;
  });

  // ======= AMOUNT IN WORDS =======
  const words = convertToWords(netTotal);

  yPos = calcBoxY + calcBoxHeight + 3;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("Amount in Words:", margin, yPos);

  const wrappedWords = doc.splitTextToSize(words, pageWidth - margin * 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60); // Dark gray for words
  wrappedWords.forEach((line, i) => {
    doc.text(line, margin + 30, yPos + 0 + (i * 5));
  });

  yPos += wrappedWords.length * 6 + 30;

  // =============== SIGNATURES ===============
  const signatureY = Math.max(yPos, calcBoxY + calcBoxHeight + 30);

  // Supplier section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100); // Dark gray
  doc.text('All items supplied as receiver order', margin + 55, signatureY - 15, { align: 'center' });

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(margin + 25, signatureY, margin + 85, signatureY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Supplier Signature', margin + 55, signatureY + 8, { align: 'center' });

  // Customer section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('All items received as my order', 155, signatureY - 15, { align: 'center' });

  doc.setDrawColor(150, 150, 150);
  doc.line(125, signatureY, 185, signatureY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Customer Signature & Date', 155, signatureY + 8, { align: 'center' });

  // =============== WATERMARK ===============
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(230, 230, 230); // Very light gray
  doc.setGState(new doc.GState({ opacity: 0.1 }));
  doc.text('VQS', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
  doc.setGState(new doc.GState({ opacity: 1 }));

  // =============== THANK YOU MESSAGE ===============
  const thankYouY = pageHeight - 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 60, 60); // Dark gray
  doc.text('Thank you for your business with us!', pageWidth / 2, thankYouY, { align: 'center' });

  // =============== SAVE PDF ===============
  const fileName = `Invoice_${invoiceData.invoiceNumber || 'VQS'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  console.log('=== PDF GENERATION COMPLETED ===');
};

// Enhanced number to words function
const convertToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelow1000 = (n) => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      return tens[ten] + (unit > 0 ? ' ' + ones[unit] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertBelow1000(remainder) : '');
  };

  const convert = (n) => {
    if (n === 0) return 'Zero';

    let result = '';

    // Crore
    if (n >= 10000000) {
      const crore = Math.floor(n / 10000000);
      result += convert(crore) + ' Crore';
      n %= 10000000;
      if (n > 0) result += ' ';
    }

    // Lakh
    if (n >= 100000) {
      const lakh = Math.floor(n / 100000);
      result += convertBelow1000(lakh) + ' Lakh';
      n %= 100000;
      if (n > 0) result += ' ';
    }

    // Thousand
    if (n >= 1000) {
      const thousand = Math.floor(n / 1000);
      result += convertBelow1000(thousand) + ' Thousand';
      n %= 1000;
      if (n > 0) result += ' ';
    }

    // Below thousand
    if (n > 0) {
      result += convertBelow1000(n);
    }

    return result.trim();
  };

  // Handle decimal part
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let words = convert(integerPart) + ' Taka';

  if (decimalPart > 0) {
    words += ' and ' + convertBelow1000(decimalPart) + ' Poisha';
  }

  return words + ' Only';
};

// Function to load and add logo
const loadAndAddLogo = async (doc) => {
  return new Promise((resolve, reject) => {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    // Try multiple possible logo paths
    const possiblePaths = [
      '/VQS.jpeg',
      '/frontend/public/VQS.jpeg',
      `${window.location.origin}/VQS.jpeg`
    ];

    let currentPathIndex = 0;

    const tryNextPath = () => {
      if (currentPathIndex >= possiblePaths.length) {
        reject(new Error('Logo not found in any path'));
        return;
      }

      const logoUrl = possiblePaths[currentPathIndex];
      console.log(`Trying to load logo from: ${logoUrl}`);
      logoImg.src = logoUrl;

      currentPathIndex++;
    };

    logoImg.onload = () => {
      try {
        console.log(`Logo loaded successfully from: ${logoImg.src}`);
        const circleCenterX = 30;
        const circleCenterY = 18;
        const circleRadius = 12;
        const imageSize = circleRadius * 2;
        const imageX = circleCenterX - circleRadius;
        const imageY = circleCenterY - circleRadius;

        // Draw white circle background
        doc.setFillColor(255, 255, 255);
        doc.circle(circleCenterX, circleCenterY, circleRadius, 'F');

        // Add image with clipping for circle
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageSize;
        canvas.height = imageSize;
        
        // Create circular mask
        ctx.beginPath();
        ctx.arc(circleRadius, circleRadius, circleRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw image
        ctx.drawImage(logoImg, 0, 0, imageSize, imageSize);
        
        // Add to PDF
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', imageX, imageY, imageSize, imageSize);
        
        resolve();
      } catch (error) {
        console.error('Error adding logo:', error);
        reject(error);
      }
    };

    logoImg.onerror = () => {
      console.warn(`Logo not found at current path, trying next...`);
      tryNextPath();
    };

    // Start trying paths
    tryNextPath();
  });
};

// Fallback function for text logo
const addTextLogo = (doc) => {
  const circleCenterX = 30;
  const circleCenterY = 18;
  const circleRadius = 12;
  
  // Draw circle with border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.circle(circleCenterX, circleCenterY, circleRadius, 'FD');
  
  // Add VQS text in circle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('VQS', circleCenterX, circleCenterY + 2, { align: 'center' });
};