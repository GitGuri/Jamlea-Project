const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const { formatCurrency } = require('../utils/formatCurrency');

// Same layout as the portal's own "Download quote" feature
// (frontend/src/utils/generateQuotePdf.js -- keep the two in sync), adapted
// to run server-side and return a Buffer instead of triggering a browser
// download. Always for an already-saved quote (has a real quote_number),
// unlike the portal version which can also PDF an unsaved cart.
const BRAND_TEAL = [13, 148, 136];
const INK = [15, 23, 42];
const GRAY = [100, 116, 139];
const MARGIN = 14;
const PAGE_WIDTH = 210;

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function generateQuotePdfBuffer({ quote, items, customer }) {
  const doc = new jsPDF();

  // -- Header: brand on the left, document type on the right --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...BRAND_TEAL);
  doc.text('TyroTech', MARGIN, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('B2B supplier for industrial parts and supplies', MARGIN, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('QUOTATION', PAGE_WIDTH - MARGIN, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Quote #${quote.quote_number}`, PAGE_WIDTH - MARGIN, 26, { align: 'right' });
  doc.text(`Date: ${formatDate(quote.created_at || new Date())}`, PAGE_WIDTH - MARGIN, 31, { align: 'right' });
  if (quote.status) {
    const status = String(quote.status);
    doc.text(`Status: ${status.charAt(0).toUpperCase()}${status.slice(1)}`, PAGE_WIDTH - MARGIN, 36, {
      align: 'right',
    });
  }

  doc.setDrawColor(...BRAND_TEAL);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 40, PAGE_WIDTH - MARGIN, 40);

  // -- Bill To: whoever this quotation actually belongs to --
  let y = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('BILL TO', MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(customer?.company_name || customer?.email || 'Customer', MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const detailLines = [];
  if (customer?.full_name) detailLines.push(customer.full_name);
  if (customer?.company_name && customer?.email) detailLines.push(customer.email);
  if (customer?.phone) detailLines.push(customer.phone);
  if (customer?.vat_number) detailLines.push(`VAT No: ${customer.vat_number}`);
  if (customer?.address) {
    doc.splitTextToSize(customer.address, 90).forEach((line) => detailLines.push(line));
  }
  for (const line of detailLines) {
    doc.text(line, MARGIN, y);
    y += 4.5;
  }

  // -- Line items --
  autoTable(doc, {
    startY: Math.max(y + 5, 68),
    head: [['Product', 'SKU', 'Unit price', 'Quantity', 'Subtotal']],
    body: items.map((item) => [
      item.products?.name || '',
      item.products?.sku || '',
      formatCurrency(item.unit_price),
      String(item.quantity),
      formatCurrency(item.unit_price * item.quantity),
    ]),
    margin: { left: MARGIN, right: MARGIN },
    headStyles: { fillColor: BRAND_TEAL, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, textColor: INK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // -- Totals --
  const finalY = doc.lastAutoTable.finalY || 68;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(PAGE_WIDTH - MARGIN - 70, finalY + 6, PAGE_WIDTH - MARGIN, finalY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text('Total', PAGE_WIDTH - MARGIN - 70, finalY + 14);
  doc.text(formatCurrency(quote.total_amount), PAGE_WIDTH - MARGIN, finalY + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Prices exclude VAT unless otherwise stated.', PAGE_WIDTH - MARGIN, finalY + 19, { align: 'right' });

  // -- Footer --
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Thank you for considering TyroTech.', MARGIN, pageHeight - 16);
  doc.text(`Generated ${formatDate(new Date())} via WhatsApp.`, MARGIN, pageHeight - 11);

  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = { generateQuotePdfBuffer };
