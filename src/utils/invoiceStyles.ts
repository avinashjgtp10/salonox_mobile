// A4 invoice styles from the SalonOX web receipt template.
export const invoiceStyles = `  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#111827;background:#d1d5db;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{position:relative;width:210mm;min-height:297mm;margin:12mm auto;background:#ffffff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}
  .inv-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:52px;font-weight:800;letter-spacing:2px;color:rgba(107,114,128,0.14);pointer-events:none;z-index:1;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Top bar: logo left, invoice title right ── */
  .inv-topbar{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px 20px;border-bottom:2px solid #111827}
  .inv-logo{width:68px;height:68px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0}
  .inv-logo-placeholder{width:68px;height:68px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#374151;flex-shrink:0}
  .inv-salon-block{display:flex;align-items:flex-start;gap:14px;min-width:0}
  .inv-salon-name{font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.3px;margin-bottom:4px}
  /* max-width + word-break so a long address wraps onto its own second line
     instead of stretching past the page edge. */
  .inv-salon-meta{font-size:10.5px;color:#6b7280;line-height:1.8;max-width:360px}
  .inv-salon-meta span{display:block;word-break:break-word}
  .inv-title-block{text-align:right;flex-shrink:0}
  .inv-title-word{font-size:26px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:2px;line-height:1}
  .inv-meta-table{margin-top:10px;font-size:11px;color:#374151;border-collapse:collapse}
  .inv-meta-table td{padding:2px 0 2px 16px;text-align:right}
  .inv-meta-table td:first-child{color:#6b7280;font-weight:600;text-transform:uppercase;font-size:9.5px;letter-spacing:0.4px;padding-left:0;text-align:left}

  /* ── Bill To + Appointment strip ── */
  .inv-info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e5e7eb}
  .inv-info-col{padding:16px 32px}
  .inv-info-col+.inv-info-col{border-left:1px solid #e5e7eb}
  .inv-section-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#111827;background:#f3f4f6;display:inline-block;padding:2px 8px;border-radius:3px;margin-bottom:12px}
  /* Single column — Bill To has an odd field count (Name/Phone/Email, plus
     optional GST/Membership/Referral rows), so a 2-column grid staggered
     unpredictably depending on which optional fields were present, leaving
     a field from one row sitting next to an unrelated field from the next. */
  .inv-info-grid{display:grid;grid-template-columns:1fr;gap:0}

  /* ── Payment status badge ── */
  .pay-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;border:1px solid currentColor}

  /* ── Items table ── */
  .inv-table-section{padding:0 32px 20px}
  .inv-section-header{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#111827;margin:18px 0 10px;padding-bottom:5px;border-bottom:2px solid #111827}
  table.inv-table{width:100%;border-collapse:collapse;font-size:11.5px}
  table.inv-table thead th{padding:8px 10px;background:#f9fafb;color:#111827;font-size:9.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;border:1px solid #d1d5db;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.inv-table thead th:nth-child(1){text-align:center;width:36px}
  table.inv-table thead th:nth-child(2){text-align:left}
  table.inv-table thead th:nth-child(3){text-align:center}
  table.inv-table thead th:nth-child(4){text-align:center}
  table.inv-table thead th:nth-child(5){text-align:center}
  table.inv-table thead th:nth-child(6){text-align:center;width:36px}
  table.inv-table thead th:nth-child(7){text-align:right}
  table.inv-table thead th:nth-child(8){text-align:right}
  table.inv-table thead th:nth-child(9){text-align:right}
  table.inv-table tbody td{border:1px solid #e5e7eb}
  table.inv-table tfoot td{padding:8px 12px;font-size:11.5px;font-weight:700;color:#111827;border:1px solid #d1d5db;background:#f9fafb;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Summary + notes ── */
  .inv-bottom{display:grid;grid-template-columns:1fr auto;gap:32px;padding:0 32px 24px;align-items:start}
  .inv-notes{font-size:11px;color:#374151;line-height:1.7;border:1px solid #e5e7eb;border-radius:4px;padding:10px 14px}
  .inv-notes-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#374151;margin-bottom:5px}
  .inv-summary-table{width:240px;border-collapse:collapse}
  .inv-summary-table td{padding:6px 12px;font-size:12px;border:1px solid #e5e7eb;color:#111827}

  /* ── Footer ── */
  .inv-footer{margin-top:auto;border-top:2px solid #111827;padding:16px 32px 18px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .inv-footer-left{font-size:12px;color:#111827;flex-shrink:0}
  .inv-footer-left strong{font-size:13px;font-weight:800}
  /* No .inv-footer-center — the footer's middle column was removed (its salon
     contact details duplicate the header). Left keeps flex-shrink:0 while
     right is allowed to shrink, so a long salon name wraps the right-hand
     block rather than pushing it off the page. */
  .inv-footer-right{font-size:10px;color:#6b7280;text-align:right;line-height:1.8;min-width:0}

`;
