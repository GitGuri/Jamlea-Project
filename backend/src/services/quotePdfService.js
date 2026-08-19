const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const { formatCurrency } = require('../utils/formatCurrency');

// Same layout as the portal's own "Download quote" feature
// (frontend/src/utils/generateQuotePdf.js), adapted to run server-side and
// return a Buffer instead of triggering a browser download -- this is
// always for an already-saved quote (has a real quote_number), unlike the
// portal version which can also PDF an unsaved cart, so the title uses the
// actual reference number instead of a generic "Quote".
function generateQuotePdfBuffer({ quote, items, customer }) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Quote #${quote.quote_number}`, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 27);

  if (customer?.company_name || customer?.email) {
    doc.text(customer.company_name || customer.email, 14, 33);
    if (customer.company_name && customer.email) {
      doc.text(customer.email, 14, 38);
    }
  }

  autoTable(doc, {
    startY: 45,
    head: [['Product', 'SKU', 'Unit price', 'Quantity', 'Subtotal']],
    body: items.map((item) => [
      item.products?.name || '',
      item.products?.sku || '',
      formatCurrency(item.unit_price),
      String(item.quantity),
      formatCurrency(item.unit_price * item.quantity),
    ]),
    headStyles: { fillColor: [20, 184, 166] },
    styles: { fontSize: 10 },
  });

  const finalY = doc.lastAutoTable.finalY || 45;
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(`Total: ${formatCurrency(quote.total_amount)}`, 14, finalY + 10);

  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = { generateQuotePdfBuffer };
