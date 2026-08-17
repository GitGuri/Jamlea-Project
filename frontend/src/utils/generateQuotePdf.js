import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';

// Builds a PDF snapshot of the current quote/cart and triggers a download.
// Runs entirely client-side against the items already in the cart, so it
// works whether or not the quote has been saved yet.
export function downloadQuotePdf({ items, totalAmount, customer }) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Quote', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${formatDate(new Date().toISOString())}`, 14, 27);

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
      item.name,
      item.sku,
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
  doc.text(`Total: ${formatCurrency(totalAmount)}`, 14, finalY + 10);

  doc.save(`quote-${Date.now()}.pdf`);
}
