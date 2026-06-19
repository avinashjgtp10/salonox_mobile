import type { InitStaff, InitService, LazyProduct, LazyMembership } from "../types/quickSale.types";

export function makeTempId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function calcRowTotal(
  price: number,
  qty: number,
  discountVal: number,
  discountType: "percentage" | "flat",
): number {
  const subtotal = price * qty;
  const discount = discountType === "percentage" ? (subtotal * discountVal) / 100 : discountVal;
  return Math.max(0, subtotal - discount);
}

export function toInitials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export function mapStaff(raw: any[]): InitStaff[] {
  return raw
    .filter((s) => s.is_active !== false)
    .map((s) => ({
      id: String(s.id),
      name: s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.fullName || "",
    }));
}

export function mapServices(raw: any[]): InitService[] {
  return raw.map((s) => ({
    id: String(s.id ?? ""),
    name: s.name || "",
    price: parseFloat(String(s.price)) || 0,
    duration: Number(s.duration_minutes ?? s.duration) || 30,
  }));
}

export function mapProducts(raw: any[]): LazyProduct[] {
  return raw.map((p) => {
    const rp = parseFloat(String(p.retail_price ?? p.selling_price ?? p.sellingPrice ?? p.price));
    const sp = parseFloat(String(p.supply_price));
    let price: number | null = null;
    if (!isNaN(rp) && rp !== 0) price = rp;
    else if (!isNaN(sp) && sp !== 0) price = sp;
    else if (p.retail_price === 0 || p.retail_price === "0") price = 0;
    return {
      id: String(p.id),
      name: p.name || "",
      price,
      stock: isNaN(parseFloat(p.amount)) ? 0 : parseFloat(p.amount),
    };
  });
}

export function mapMemberships(raw: any[]): LazyMembership[] {
  return raw.map((m) => ({ name: m.name || "", price: m.price || 0 }));
}

export function extractLocalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function isPhoneSearch(val: string): boolean {
  const stripped = val.trim();
  if (!stripped) return false;
  const digits = stripped.replace(/\D/g, "");
  return /^\+?[\d\s\-().]+$/.test(stripped) && digits.length === 10;
}