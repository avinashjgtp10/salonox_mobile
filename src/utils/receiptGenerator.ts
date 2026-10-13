import { generateInvoiceDocument } from "./invoiceDocument";
export interface ReceiptData {
  salon: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
    logoUrl?: string;
  };
  invoice: {
    invoiceNumber: string;
    date: string;
    time: string;
    paymentMethod: string;
    paymentStatus?: string;
  };
  paymentBreakdown?: { method: string; amount: number }[];
  client: {
    name: string;
    phone?: string;
    email?: string;
  };
  staffName?: string;
  items: {
    name: string;
    qty: number;
    price: number;
    total: number;
    discount?: number;
    type?: string;
    staffName?: string;
    tax?: number;
  }[];
  pricing: {
    subtotal: number;
    itemDiscountTotal?: number;
    manualDiscount?: number;
    couponDiscount?: number;
    taxableAmount?: number;
    gstAmount: number;
    taxBreakdown?: {
      name: string;
      rate: number;
      amount: number;
      inclusive: boolean;
    }[];
    exCharges?: number;
    tipAmount?: number;
    roundOff?: number;
    grandTotal: number;
    amountPaid?: number;
    dueAmount?: number;
  };
  paperSize?: "A4" | "80mm" | "58mm";
  notes?: string;
  couponCode?: string;
  footerMessage?: string;
  upiQrUrl?: string;
}


export function generateReceiptHtml(data: ReceiptData): string {
  return generateInvoiceDocument(data);
}
