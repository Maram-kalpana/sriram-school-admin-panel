const PDFDocument = require('pdfkit');
const { amountInWords, round2 } = require('../utils/gst');

function collect(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function header(doc, profile, title) {
  doc.fontSize(16).fillColor('#0f172a').text(profile.legal_name || 'Scholar Store', { align: 'left' });
  doc.fontSize(9).fillColor('#334155');
  if (profile.gstin) doc.text(`GSTIN: ${profile.gstin}`);
  doc.text([profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(', '));
  if (profile.phone || profile.email) doc.text([profile.phone, profile.email].filter(Boolean).join(' · '));
  doc.moveDown(0.5).fillColor('#0f172a').fontSize(14).text(title, { align: 'center' });
  doc.moveDown(0.5);
}

function parseAddr(order) {
  const addr = typeof order.address_snapshot === 'string'
    ? JSON.parse(order.address_snapshot)
    : order.address_snapshot || {};
  return addr;
}

function drawInvoice(doc, { profile, order, items, student }) {
  header(doc, profile, 'GST TAX INVOICE');
  doc.fontSize(10).fillColor('#0f172a');
  doc.text(`Invoice No: ${order.invoice_number || '—'}`);
  doc.text(`Invoice Date: ${order.invoice_date || order.created_at || ''}`);
  doc.text(`Order: ${order.order_number}`);
  doc.moveDown(0.5);
  const addr = parseAddr(order);
  doc.text('Bill To / Ship To');
  doc.text(`${student?.student_name || order.student_name || ''} (${student?.admission_number || ''})`);
  doc.text([addr.address1, addr.address2, addr.city, addr.state, addr.zipcode].filter(Boolean).join(', '));
  doc.moveDown(0.5);

  doc.fontSize(8);
  const y = doc.y;
  doc.text('HSN', 40, y);
  doc.text('Item', 90, y);
  doc.text('Qty', 280, y);
  doc.text('Rate', 310, y);
  doc.text('Taxable', 350, y);
  doc.text('CGST', 400, y);
  doc.text('SGST', 440, y);
  doc.text('IGST', 480, y);
  doc.moveTo(40, y + 12).lineTo(555, y + 12).stroke();
  doc.y = y + 16;

  items.forEach((i) => {
    const yy = doc.y;
    doc.text(i.hsn_code || '—', 40, yy, { width: 45 });
    doc.text(i.name_snapshot || '', 90, yy, { width: 170 });
    doc.text(String(i.quantity), 280, yy);
    doc.text(String(round2(i.unit_price)), 310, yy);
    doc.text(String(round2(i.taxable_value || 0)), 350, yy);
    doc.text(String(round2(i.cgst || 0)), 400, yy);
    doc.text(String(round2(i.sgst || 0)), 440, yy);
    doc.text(String(round2(i.igst || 0)), 480, yy);
    doc.y = yy + 16;
  });

  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Taxable: ₹${round2(order.taxable_total || 0)}`);
  doc.text(`CGST: ₹${round2(order.cgst_total || 0)}  SGST: ₹${round2(order.sgst_total || 0)}  IGST: ₹${round2(order.igst_total || 0)}`);
  doc.fontSize(12).text(`Total: ₹${round2(order.total)}`);
  doc.fontSize(9).text(`Amount in words: ${amountInWords(order.total)}`);
}

function drawPackingSlip(doc, { profile, order, items, student }) {
  header(doc, profile, 'PACKING SLIP');
  doc.fontSize(10).fillColor('#0f172a');
  doc.text(`Packing slip: ${order.packing_slip_number || '—'}`);
  doc.text(`Order: ${order.order_number}`);
  const addr = parseAddr(order);
  doc.moveDown(0.5);
  doc.text(`${student?.student_name || ''} (${student?.admission_number || ''}) · ${student?.house_color || ''}`);
  doc.text([addr.address1, addr.address2, addr.city, addr.state, addr.zipcode].filter(Boolean).join(', '));
  doc.moveDown();
  items.forEach((i) => {
    doc.text(`${i.sku_snapshot}  ${i.name_snapshot}  ${i.option_snapshot || ''}  ×${i.quantity}`);
  });
}

async function invoicesPdf(docs) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  docs.forEach((payload, i) => {
    if (i > 0) doc.addPage();
    drawInvoice(doc, payload);
  });
  return collect(doc);
}

async function packingSlipsPdf(docs) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  docs.forEach((payload, i) => {
    if (i > 0) doc.addPage();
    drawPackingSlip(doc, payload);
  });
  return collect(doc);
}

async function invoicePdf(payload) {
  return invoicesPdf([payload]);
}

async function packingSlipPdf(payload) {
  return packingSlipsPdf([payload]);
}

module.exports = { invoicePdf, packingSlipPdf, invoicesPdf, packingSlipsPdf };
