import { useRef } from 'react';
import { Printer, Download, Share2, X, CheckCircle } from 'lucide-react';
import type { Sale, BusinessSettings } from '../types';
import { fmtCurrency, formatDate } from '../lib/calculations';

export interface ReceiptData {
  sale: Sale;
  receiptNumber: string;
  businessName: string;
  settings: Partial<BusinessSettings>;
}

interface ReceiptProps extends ReceiptData {
  onClose: () => void;
}

function ReceiptDocument({ sale, receiptNumber, businessName, settings }: ReceiptData) {
  const time = sale.sale_time
    ?? (sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

  return (
    <div
      id="receipt-print-area"
      style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '13px', lineHeight: '1.4', color: '#111', background: '#fff', width: '100%', maxWidth: '340px', margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: '8px', marginBottom: '8px' }}>
        {settings.receipt_header && (
          <div style={{ fontSize: '11px', marginBottom: '4px', color: '#555' }}>{settings.receipt_header}</div>
        )}
        <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>{businessName.toUpperCase()}</div>
        {settings.address && <div style={{ fontSize: '11px', marginTop: '2px' }}>{settings.address}</div>}
        {settings.phone && <div style={{ fontSize: '11px' }}>Tel: {settings.phone}</div>}
        {settings.email && <div style={{ fontSize: '11px' }}>{settings.email}</div>}
        {settings.website && <div style={{ fontSize: '11px' }}>{settings.website}</div>}
      </div>

      {/* Receipt number & date/time */}
      <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '8px', color: '#555' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>RECEIPT #{receiptNumber}</div>
        <div>{formatDate(sale.sale_date)}{time ? ` \u00a0 ${time}` : ''}</div>
      </div>

      {/* Customer */}
      {sale.customer_name && (
        <div style={{ borderTop: '1px dashed #aaa', borderBottom: '1px dashed #aaa', padding: '4px 0', marginBottom: '8px', fontSize: '12px' }}>
          <span style={{ color: '#555' }}>Customer: </span>
          <span style={{ fontWeight: 'bold' }}>{sale.customer_name}</span>
        </div>
      )}

      {/* Items header */}
      <div style={{ borderBottom: '1px dashed #aaa', marginBottom: '8px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '2px', marginBottom: '4px', fontSize: '11px', gap: '4px' }}>
          <span style={{ flex: 2 }}>ITEM</span>
          <span style={{ textAlign: 'right', flex: '0 0 28px' }}>QTY</span>
          <span style={{ textAlign: 'right', flex: 1 }}>PRICE</span>
          <span style={{ textAlign: 'right', flex: 1 }}>TOTAL</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '4px' }}>
          <span style={{ flex: 2, wordBreak: 'break-word' }}>{sale.product_name}</span>
          <span style={{ textAlign: 'right', flex: '0 0 28px' }}>{sale.quantity_sold}</span>
          <span style={{ textAlign: 'right', flex: 1 }}>{fmtCurrency(sale.selling_price)}</span>
          <span style={{ textAlign: 'right', flex: 1 }}>{fmtCurrency(sale.quantity_sold * sale.selling_price)}</span>
        </div>
        {sale.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#c00', marginTop: '2px', gap: '4px' }}>
            <span style={{ flex: 2 }}>Discount</span>
            <span style={{ textAlign: 'right', flex: 1 }}>-{fmtCurrency(sale.discount)}</span>
          </div>
        )}
      </div>

      {/* Totals */}
      <div style={{ borderBottom: '2px solid #111', marginBottom: '8px', paddingBottom: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
          <span>TOTAL</span><span>{fmtCurrency(sale.total_sale)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#555' }}>Amount Paid</span><span>{fmtCurrency(sale.amount_paid)}</span>
        </div>
        {sale.change_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#006600' }}>
            <span>Change</span><span>{fmtCurrency(sale.change_amount)}</span>
          </div>
        )}
      </div>

      {/* Payment & Staff */}
      <div style={{ fontSize: '11px', textAlign: 'center', marginBottom: '8px', color: '#555' }}>
        <div>Payment: <strong>{sale.payment_method.replace(/_/g, ' ').toUpperCase()}</strong></div>
        {sale.staff_member && <div>Served by: {sale.staff_member}</div>}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#555', borderTop: '1px dashed #aaa', paddingTop: '8px' }}>
        {settings.thank_you_message
          ? <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{settings.thank_you_message}</div>
          : <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Thank you for your business!</div>
        }
        {settings.receipt_footer && <div>{settings.receipt_footer}</div>}
        {!settings.receipt_footer && <div>Please retain this receipt</div>}
      </div>
    </div>
  );
}

export function Receipt({ sale, receiptNumber, businessName, settings, onClose }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = document.getElementById('receipt-print-area');
    if (!content) return;
    const win = window.open('', '_blank', 'width=400,height=650');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt #${receiptNumber}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Courier New',Courier,monospace;background:#fff;padding:12px}
        @media print{@page{margin:4mm;size:80mm auto}body{padding:0}}
      </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const buildShareText = () => {
    const lines = [
      `*${businessName.toUpperCase()}*`,
      settings.address ?? '',
      settings.phone ? `Tel: ${settings.phone}` : '',
      '',
      `*Receipt #${receiptNumber}*`,
      `Date: ${formatDate(sale.sale_date)}`,
      sale.customer_name ? `Customer: ${sale.customer_name}` : '',
      '',
      `*${sale.product_name}*`,
      `Qty: ${sale.quantity_sold} x ${fmtCurrency(sale.selling_price)}`,
      sale.discount > 0 ? `Discount: -${fmtCurrency(sale.discount)}` : '',
      '',
      `*Total: ${fmtCurrency(sale.total_sale)}*`,
      `Paid: ${fmtCurrency(sale.amount_paid)}`,
      sale.change_amount > 0 ? `Change: ${fmtCurrency(sale.change_amount)}` : '',
      `Payment: ${sale.payment_method.replace(/_/g, ' ').toUpperCase()}`,
      '',
      settings.thank_you_message ?? 'Thank you for your business!',
    ].filter(Boolean).join('\n');
    return lines;
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadPDF = () => {
    const content = document.getElementById('receipt-print-area');
    if (!content) return;
    const win = window.open('', '_blank', 'width=700,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt #${receiptNumber}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;background:#fff;padding:40px}
        @media print{@page{size:A4;margin:20mm}body{padding:0}}
      </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-500" />
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Sale Recorded Successfully</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Receipt #{receiptNumber}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon btn-secondary" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900/50">
          <div ref={printRef} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mx-auto" style={{ maxWidth: 340 }}>
            <ReceiptDocument
              sale={sale}
              receiptNumber={receiptNumber}
              businessName={businessName}
              settings={settings}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handlePrint} className="btn btn-secondary flex-col gap-1 py-3 h-auto text-xs font-medium">
              <Printer size={18} className="text-blue-600 dark:text-blue-400" />
              <span>Print</span>
            </button>
            <button onClick={handleWhatsApp} className="btn btn-secondary flex-col gap-1 py-3 h-auto text-xs font-medium">
              <Share2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </button>
            <button onClick={handleDownloadPDF} className="btn btn-secondary flex-col gap-1 py-3 h-auto text-xs font-medium">
              <Download size={18} className="text-violet-600 dark:text-violet-400" />
              <span>PDF</span>
            </button>
          </div>
          <button onClick={onClose} className="btn btn-primary w-full">Done</button>
        </div>
      </div>
    </div>
  );
}
